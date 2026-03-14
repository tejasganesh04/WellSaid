import useSessionStore from '../store/sessionStore'

export default function StatusBar() {
  const { connectionStatus, sttMode, degradedServices } = useSessionStore()

  const banners = []

  if (connectionStatus === 'reconnecting') {
    banners.push({ key: 'reconnecting', text: 'Reconnecting...', color: 'bg-yellow-900 text-yellow-300' })
  }
  if (connectionStatus === 'disconnected') {
    banners.push({ key: 'disconnected', text: 'Connection lost — trying to reconnect', color: 'bg-red-900 text-red-300' })
  }
  if (sttMode === 'webspeech') {
    banners.push({ key: 'stt', text: 'Transcription degraded — using browser fallback (lower accuracy)', color: 'bg-yellow-900 text-yellow-300' })
  }
  if (sttMode === 'none') {
    banners.push({ key: 'stt_none', text: 'Transcription unavailable — type your answers or continue verbally', color: 'bg-red-900 text-red-300' })
  }
  if (degradedServices.includes('camera')) {
    banners.push({ key: 'camera', text: 'Camera offline — continuing in audio-only mode', color: 'bg-gray-800 text-gray-400' })
  }

  if (banners.length === 0) return null

  return (
    <div className="flex flex-col">
      {banners.map((b) => (
        <div key={b.key} className={`text-xs px-4 py-1.5 text-center ${b.color}`}>
          {b.text}
        </div>
      ))}
    </div>
  )
}
