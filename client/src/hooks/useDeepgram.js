import { useEffect, useRef, useCallback } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import useSessionStore from '../store/sessionStore'
import socket from '../services/socket'

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY
const COACHING_WORD_THRESHOLD = 20
const MIN_ANSWER_WORDS = 10   // don't submit if user has barely said anything

export function useDeepgram() {
  const connectionRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const finalAnswerRef = useRef('')
  const wordsSinceLastCoachRef = useRef(0)
  const isActiveRef = useRef(false)
  const webSpeechRef = useRef(null)

  const {
    appendTranscript, clearTranscript, micActive, sessionStatus, coachEnabled,
    setSttMode, addDegradedService, removeDegradedService,
  } = useSessionStore()

  // ─── Web Speech API fallback ────────────────────────────────────────────
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSttMode('none')
      addDegradedService('stt')
      console.warn('[stt] no fallback available')
      return
    }

    setSttMode('webspeech')
    addDegradedService('stt')
    console.warn('[stt] falling back to Web Speech API')

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    webSpeechRef.current = recognition

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalAnswerRef.current += ' ' + transcript
          appendTranscript(transcript)

          const newWordCount = transcript.trim().split(/\s+/).length
          wordsSinceLastCoachRef.current += newWordCount
          if (coachEnabled && wordsSinceLastCoachRef.current >= COACHING_WORD_THRESHOLD) {
            wordsSinceLastCoachRef.current = 0
            const { currentQuestion } = useSessionStore.getState()
            socket.emit('transcript:chunk', { transcript: finalAnswerRef.current.trim(), currentQuestion })
          }
        }
      }
    }

    // Debounce speechend — Web Speech fires this on any brief pause
    let speechEndTimer = null
    recognition.onspeechend = () => {
      clearTimeout(speechEndTimer)
      speechEndTimer = setTimeout(() => {
        const answer = finalAnswerRef.current.trim()
        const wordCount = answer.split(/\s+/).length
        if (answer && wordCount >= MIN_ANSWER_WORDS) {
          socket.emit('answer:complete', { answer, transcript: answer })
          finalAnswerRef.current = ''
          wordsSinceLastCoachRef.current = 0
          clearTranscript()
        }
      }, 2000)   // wait 2s after speech ends before submitting
    }
    recognition.onspeechstart = () => clearTimeout(speechEndTimer)

    recognition.onerror = (e) => {
      console.error('[webspeech] error:', e.error)
      if (e.error === 'no-speech' || e.error === 'audio-capture') {
        // Restart recognition — these errors don't stop continuous mode in all browsers
        try { recognition.stop() } catch (_) {}
        setTimeout(() => {
          try { recognition.start() } catch (_) {}
        }, 300)
      }
    }
    recognition.start()
  }, [appendTranscript, clearTranscript, coachEnabled, setSttMode, addDegradedService])

  // ─── Stop everything ─────────────────────────────────────────────────────
  const stop = useCallback(() => {
    isActiveRef.current = false
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    connectionRef.current?.finish()
    webSpeechRef.current?.stop()
    recorderRef.current = null
    streamRef.current = null
    connectionRef.current = null
    webSpeechRef.current = null
  }, [])

  // ─── Start Deepgram (primary) ─────────────────────────────────────────────
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
        utterance_end_ms: 7000,
        vad_events: true,
      })
      connectionRef.current = connection

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const words = data.channel?.alternatives?.[0]?.transcript
        if (!words || words.trim() === '') return

        if (data.is_final) {
          finalAnswerRef.current += ' ' + words
          appendTranscript(words)

          const newWordCount = words.trim().split(/\s+/).length
          wordsSinceLastCoachRef.current += newWordCount
          if (coachEnabled && wordsSinceLastCoachRef.current >= COACHING_WORD_THRESHOLD) {
            wordsSinceLastCoachRef.current = 0
            const { currentQuestion } = useSessionStore.getState()
            socket.emit('transcript:chunk', { transcript: finalAnswerRef.current.trim(), currentQuestion })
          }
        }
      })

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const answer = finalAnswerRef.current.trim()
        if (!answer) return
        const wordCount = answer.split(/\s+/).length
        if (wordCount < MIN_ANSWER_WORDS) return   // still mid-sentence pause, not done
        socket.emit('answer:complete', { answer, transcript: answer })
        finalAnswerRef.current = ''
        wordsSinceLastCoachRef.current = 0
        clearTranscript()
      })

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[deepgram] error — switching to fallback:', err)
        isActiveRef.current = false
        connectionRef.current = null
        startWebSpeech()
      })

      connection.on(LiveTranscriptionEvents.Close, (event) => {
        console.warn('[deepgram] close event — code:', event?.code, 'reason:', event?.reason)
        // Only fall back if we're still supposed to be active (unexpected close)
        if (isActiveRef.current && useSessionStore.getState().sessionStatus === 'active') {
          console.warn('[deepgram] unexpected close — switching to fallback')
          isActiveRef.current = false
          startWebSpeech()
        }
      })

      connection.on(LiveTranscriptionEvents.Open, () => {
        setSttMode('deepgram')
        removeDegradedService('stt')
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
      console.error('[deepgram] failed to start, trying fallback:', err.message)
      isActiveRef.current = false
      startWebSpeech()
    }
  }, [appendTranscript, clearTranscript, coachEnabled, startWebSpeech, setSttMode, removeDegradedService])

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
