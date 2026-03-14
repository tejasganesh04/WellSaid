import { useEffect, useRef, useCallback } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import useSessionStore from '../store/sessionStore'
import socket from '../services/socket'

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY
const COACHING_WORD_THRESHOLD = 20   // emit transcript:chunk every 20 new final words

export function useDeepgram() {
  const connectionRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const finalAnswerRef = useRef('')      // accumulates final words for this answer turn
  const wordsSinceLastCoachRef = useRef(0)  // tracks words since last coaching trigger
  const isActiveRef = useRef(false)

  const { appendTranscript, clearTranscript, micActive, sessionStatus, coachEnabled } = useSessionStore()

  const stop = useCallback(() => {
    isActiveRef.current = false
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    connectionRef.current?.finish()
    recorderRef.current = null
    streamRef.current = null
    connectionRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (isActiveRef.current) return
    isActiveRef.current = true
    finalAnswerRef.current = ''
    wordsSinceLastCoachRef.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const deepgram = createClient(DEEPGRAM_API_KEY)
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
        vad_events: true,
      })
      connectionRef.current = connection

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const words = data.channel?.alternatives?.[0]?.transcript
        if (!words || words.trim() === '') return

        if (data.is_final) {
          finalAnswerRef.current += ' ' + words
          appendTranscript(words)

          // Count new words and fire coaching chunk if threshold crossed
          const newWordCount = words.trim().split(/\s+/).length
          wordsSinceLastCoachRef.current += newWordCount

          if (coachEnabled && wordsSinceLastCoachRef.current >= COACHING_WORD_THRESHOLD) {
            wordsSinceLastCoachRef.current = 0
            const { currentQuestion } = useSessionStore.getState()
            socket.emit('transcript:chunk', {
              transcript: finalAnswerRef.current.trim(),
              currentQuestion,
            })
          }
        }
      })

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const answer = finalAnswerRef.current.trim()
        if (!answer) return

        console.log('[deepgram] utterance ended')
        socket.emit('answer:complete', { answer, transcript: answer })

        finalAnswerRef.current = ''
        wordsSinceLastCoachRef.current = 0
        clearTranscript()
      })

      connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('[deepgram] speech started')
      })

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[deepgram] error:', err)
      })

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('[deepgram] connection closed')
      })

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[deepgram] connection open')
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        recorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(e.data)
          }
        }
        recorder.start(250)
      })

    } catch (err) {
      console.error('[deepgram] failed to start:', err.message)
      isActiveRef.current = false
    }
  }, [appendTranscript, clearTranscript, coachEnabled])

  useEffect(() => {
    if (sessionStatus === 'active' && micActive) {
      start()
    } else {
      stop()
    }
    return stop
  }, [sessionStatus, micActive])

  return { start, stop }
}
