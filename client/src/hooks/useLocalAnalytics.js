import { useEffect, useRef } from 'react'
import useSessionStore from '../store/sessionStore'

const FILLER_WORDS = /\b(um|uh|like|you know|basically|literally|actually|so|right|okay|kind of|sort of)\b/gi
const WPM_WINDOW_MS = 30000       // rolling 30s window for WPM
const WPM_TOO_FAST = 180
const WPM_TOO_SLOW = 80
const COACH_COOLDOWN_MS = 8000    // don't repeat same hint within 8s

export function useLocalAnalytics() {
  const { liveTranscript, coachEnabled, addCoachCard, sessionStatus } = useSessionStore()

  const lastHintTime = useRef({})       // hint_key → timestamp
  const wordTimestamps = useRef([])     // for WPM calculation
  const prevWordCount = useRef(0)

  function canFire(key) {
    const last = lastHintTime.current[key] || 0
    return Date.now() - last > COACH_COOLDOWN_MS
  }

  function fire(key, text, type = 'delivery') {
    if (!canFire(key)) return
    lastHintTime.current[key] = Date.now()
    addCoachCard({ text, type })
  }

  useEffect(() => {
    if (sessionStatus !== 'active' || !coachEnabled || !liveTranscript) return

    const words = liveTranscript.trim().split(/\s+/).filter(Boolean)
    const wordCount = words.length

    // Track new words for WPM
    const now = Date.now()
    const newWords = wordCount - prevWordCount.current
    if (newWords > 0) {
      for (let i = 0; i < newWords; i++) {
        wordTimestamps.current.push(now)
      }
    }
    prevWordCount.current = wordCount

    // Prune old timestamps outside the 30s window
    wordTimestamps.current = wordTimestamps.current.filter((t) => now - t < WPM_WINDOW_MS)

    // --- WPM check ---
    const windowSecs = Math.min((now - (wordTimestamps.current[0] || now)) / 1000, 30)
    if (windowSecs > 5 && wordTimestamps.current.length > 10) {
      const wpm = Math.round((wordTimestamps.current.length / windowSecs) * 60)
      if (wpm > WPM_TOO_FAST) fire('wpm_fast', 'Slow down — you\'re speaking too fast', 'delivery')
      else if (wpm < WPM_TOO_SLOW && wpm > 0) fire('wpm_slow', 'You can speak a bit faster', 'delivery')
    }

    // --- Filler word check ---
    const fillerMatches = liveTranscript.match(FILLER_WORDS) || []
    if (fillerMatches.length >= 3) {
      fire('fillers', `Watch the filler words (${fillerMatches.slice(0, 3).join(', ')})`, 'delivery')
    }

    // --- Answer length check ---
    if (wordCount > 250) {
      fire('too_long', 'Your answer is getting long — wrap up', 'delivery')
    }

  }, [liveTranscript, coachEnabled, sessionStatus])

  // Reset on each new question turn
  useEffect(() => {
    prevWordCount.current = 0
    wordTimestamps.current = []
  }, [sessionStatus])
}
