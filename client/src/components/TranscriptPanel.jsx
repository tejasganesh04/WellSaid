import useSessionStore from '../store/sessionStore'

export default function TranscriptPanel() {
  const { liveTranscript } = useSessionStore()

  return (
    <div className="bg-gray-900 rounded-2xl p-5 min-h-[100px] max-h-[200px] overflow-y-auto">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Your answer</p>
      {liveTranscript.trim() ? (
        <p className="text-gray-200 text-sm leading-relaxed">{liveTranscript.trim()}</p>
      ) : (
        <p className="text-gray-600 text-sm">Start speaking — your words will appear here in real time.</p>
      )}
    </div>
  )
}
