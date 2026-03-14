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
  } = useSessionStore()

  useEffect(() => {
    // Interviewer sent a new question
    socket.on('interviewer:question', ({ question, latency }) => {
      setCurrentQuestion(question)
      if (latency) setLatencyMetrics(latency)
    })

    // Interviewer is thinking (LLM generating)
    socket.on('interviewer:thinking', () => {
      setInterviewerThinking(true)
    })

    // Coaching hint arrived
    socket.on('coach:hint', ({ hint, type }) => {
      addCoachCard({ text: hint, type }) // type: 'delivery' | 'semantic'
    })

    // Session ended (normal or early termination)
    socket.on('session:ended', ({ status, message }) => {
      setSessionStatus(status)
      if (message) {
        // Interviewer issued a closing statement (early termination)
        addCoachCard({ text: message, type: 'system' })
      }
      navigate('/report')
    })

    // Report is ready
    socket.on('report:ready', ({ report }) => {
      setReport(report)
    })

    socket.on('connect', () => console.log('Socket connected'))
    socket.on('disconnect', () => console.log('Socket disconnected'))

    return () => {
      socket.off('interviewer:question')
      socket.off('interviewer:thinking')
      socket.off('coach:hint')
      socket.off('session:ended')
      socket.off('report:ready')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])
}
