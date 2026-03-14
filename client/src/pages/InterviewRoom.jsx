import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSessionStore from '../store/sessionStore'
import { useSocket } from '../hooks/useSocket'
import { useDeepgram } from '../hooks/useDeepgram'
import { useLocalAnalytics } from '../hooks/useLocalAnalytics'
import socket from '../services/socket'

import QuestionPanel from '../components/QuestionPanel'
import TranscriptPanel from '../components/TranscriptPanel'
import CoachingSidebar from '../components/CoachingSidebar'
import WebcamPiP from '../components/WebcamPiP'
import Controls from '../components/Controls'

export default function InterviewRoom() {
  const navigate = useNavigate()
  const { sessionConfig, setSessionStatus, sessionStatus } = useSessionStore()

  useSocket()           // listens for interviewer:question, coach:hint, session:ended etc.
  useDeepgram()         // mic → Deepgram → transcript → answer:complete
  useLocalAnalytics()   // fast browser-side coaching (WPM, fillers, length)

  useEffect(() => {
    if (!sessionConfig) {
      navigate('/')
      return
    }

    socket.connect()
    socket.emit('session:start', { sessionConfig })
    setSessionStatus('active')

    return () => {
      socket.disconnect()
    }
  }, [])

  function handleEndSession() {
    const { sessionId } = useSessionStore.getState()   // .getState() is safe outside hooks
    socket.emit('session:end', { sessionId })
    setSessionStatus('ended')
    navigate('/report')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <span className="font-semibold text-white">WellSaid</span>
        <button onClick={handleEndSession} className="text-sm text-red-400 hover:text-red-300">
          End Session
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
          <QuestionPanel />
          <WebcamPiP />
          <TranscriptPanel />
          <Controls onEnd={handleEndSession} />
        </div>
        <CoachingSidebar />
      </div>
    </div>
  )
}
