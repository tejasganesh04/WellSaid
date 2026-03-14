import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DeviceCheck() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [camOk, setCamOk] = useState(null)
  const [micOk, setMicOk] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamOk(true)
        setMicOk(true)
        // Clean up stream preview after check (real stream is started in InterviewRoom)
        return () => stream.getTracks().forEach((t) => t.stop())
      } catch {
        setCamOk(false)
        setMicOk(false)
      }
    }
    check()
  }, [])

  const allOk = camOk && micOk

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">Device Check</h1>

      <video ref={videoRef} autoPlay muted playsInline
        className="w-72 h-48 bg-gray-900 rounded-xl object-cover"
      />

      <div className="flex flex-col gap-3 w-72">
        <StatusRow label="Microphone" status={micOk} />
        <StatusRow label="Camera" status={camOk} />
      </div>

      {allOk && (
        <button
          onClick={() => navigate('/interview')}
          className="px-8 py-3 bg-white text-gray-950 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Enter Interview
        </button>
      )}
      {(camOk === false || micOk === false) && (
        <p className="text-red-400 text-sm text-center">
          Please allow camera and microphone access in your browser, then refresh.
        </p>
      )}
    </div>
  )
}

function StatusRow({ label, status }) {
  return (
    <div className="flex items-center justify-between bg-gray-900 px-4 py-3 rounded-lg">
      <span className="text-gray-300">{label}</span>
      {status === null && <span className="text-gray-500 text-sm">Checking...</span>}
      {status === true && <span className="text-green-400 text-sm">✓ Ready</span>}
      {status === false && <span className="text-red-400 text-sm">✗ Not found</span>}
    </div>
  )
}
