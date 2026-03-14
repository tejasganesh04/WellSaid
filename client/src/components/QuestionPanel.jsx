import useSessionStore from '../store/sessionStore'

export default function QuestionPanel() {
  const { currentQuestion, isInterviewerThinking, sessionStatus } = useSessionStore()

  return (
    <div className="bg-gray-900 rounded-2xl p-6 min-h-[120px] flex flex-col justify-center">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Interviewer</p>
      {sessionStatus === 'idle' && (
        <p className="text-gray-500 text-lg">Starting session...</p>
      )}
      {isInterviewerThinking && (
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-sm">Thinking</span>
          <span className="animate-pulse">...</span>
        </div>
      )}
      {currentQuestion && !isInterviewerThinking && (
        <p className="text-white text-xl leading-relaxed">{currentQuestion}</p>
      )}
    </div>
  )
}
