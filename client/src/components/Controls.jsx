import useSessionStore from '../store/sessionStore'

export default function Controls({ onEnd }) {
  const { micActive, camActive, setMicActive, setCamActive } = useSessionStore()

  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => setMicActive(!micActive)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${micActive ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-900 text-red-300 hover:bg-red-800'}`}
      >
        {micActive ? '🎤 Mic On' : '🔇 Mic Off'}
      </button>

      <button
        onClick={() => setCamActive(!camActive)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${camActive ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-900 text-red-300 hover:bg-red-800'}`}
      >
        {camActive ? '📷 Cam On' : '📷 Cam Off'}
      </button>

      <button
        onClick={onEnd}
        className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-red-900 text-red-300 hover:bg-red-800 transition-colors"
      >
        End Session
      </button>
    </div>
  )
}
