import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../services/socket'
import useSessionStore from '../store/sessionStore'

export function useSocket() {
  const navigate = useNavigate()
  const {
    setCurrentQuestion,
    setInterviewerThinking,
    addCoachCard,
    setSessionStatus,
    setLatencyMetrics,
    setReport,
    setConnectionStatus,
    sessionId,
  } = useSessionStore()

  useEffect(() => {
    // ─── Interviewer events ──────────────────────────────────────
    socket.on('interviewer:question', ({ question, latency }) => {
      setCurrentQuestion(question)
      if (latency) {
        latency.question_rendered_at = Date.now()
        setLatencyMetrics(latency)
      }
    })

    socket.on('interviewer:thinking', () => setInterviewerThinking(true))

    // ─── Coaching events ──────────────────────────────────────────
    socket.on('coach:hint', ({ hint, type }) => {
      addCoachCard({ text: hint, type })
    })

    // ─── Session lifecycle ────────────────────────────────────────
    socket.on('session:created', ({ sessionId: id }) => {
      useSessionStore.getState().setSessionId(id)
    })

    socket.on('session:ended', ({ status, message }) => {
      setSessionStatus(status)
      if (message) addCoachCard({ text: message, type: 'system' })
      navigate('/report')
    })

    socket.on('report:ready', ({ report }) => {
      setReport(report)
    })

    // ─── Connection resilience ────────────────────────────────────
    socket.on('connect', () => {
      setConnectionStatus('connected')
      console.log('[socket] connected')

      // If we had an active session before disconnect, try to rejoin
      const { sessionId: sid, sessionStatus } = useSessionStore.getState()
      if (sid && sessionStatus === 'active') {
        console.log('[socket] rejoining session:', sid)
        socket.emit('session:rejoin', { sessionId: sid })
      }
    })

    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnected:', reason)
      setConnectionStatus('disconnected')
    })

    socket.on('reconnecting', (attempt) => {
      console.log('[socket] reconnecting, attempt:', attempt)
      setConnectionStatus('reconnecting')
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] connect error:', err.message)
      setConnectionStatus('disconnected')
    })

    return () => {
      socket.off('interviewer:question')
      socket.off('interviewer:thinking')
      socket.off('coach:hint')
      socket.off('session:created')
      socket.off('session:ended')
      socket.off('report:ready')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reconnecting')
      socket.off('connect_error')
    }
  }, [])
}
