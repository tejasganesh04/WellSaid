import { useEffect, useRef, useCallback } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import useSessionStore from '../store/sessionStore'
import socket from '../services/socket'

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY

export function useDeepgram() {
  const connectionRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const finalAnswerRef = useRef('')   // accumulates final words for this answer turn
  const isActiveRef = useRef(false)

  const { appendTranscript, clearTranscript, micActive, sessionStatus } = useSessionStore()

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

    try {
      // 1. Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 2. Create Deepgram live connection
      const deepgram = createClient(DEEPGRAM_API_KEY)
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,   // fires UtteranceEnd after 1.5s of silence
        vad_events: true,
      })
      connectionRef.current = connection

      // 3. On transcript event
      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const words = data.channel?.alternatives?.[0]?.transcript
        if (!words || words.trim() === '') return

        if (data.is_final) {
          // Final word — accumulate into the answer buffer
          finalAnswerRef.current += ' ' + words
          appendTranscript(words)
        } else {
          // Interim/partial — just show it (don't accumulate)
          // We only update the store display; finalAnswerRef only gets finals
          appendTranscript('')   // trigger re-render with interim shown separately if needed
        }
      })

      // 4. UtteranceEnd = user stopped speaking — submit the answer
      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const answer = finalAnswerRef.current.trim()
        if (!answer) return

        console.log('[deepgram] utterance ended, answer:', answer)

        // Send to Node server via socket
        socket.emit('answer:complete', {
          answer,
          transcript: answer,
        })

        // Reset for next answer
        finalAnswerRef.current = ''
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

      // 5. Feed mic audio into Deepgram via MediaRecorder
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[deepgram] connection open')

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        recorderRef.current = recorder

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(e.data)
          }
        }

        recorder.start(250)  // send chunks every 250ms
      })

    } catch (err) {
      console.error('[deepgram] failed to start:', err.message)
      isActiveRef.current = false
    }
  }, [appendTranscript, clearTranscript])

  // Start/stop based on mic toggle and session status
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
