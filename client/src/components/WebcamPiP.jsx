import { useEffect, useRef } from 'react'
import useSessionStore from '../store/sessionStore'

export default function WebcamPiP() {
  const videoRef = useRef(null)
  const { camActive, faceVisible } = useSessionStore()

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        // cam not available — handled via camActive state
      }
    }
    if (camActive) startCam()
  }, [camActive])

  if (!camActive) {
    return (
      <div className="w-40 h-28 bg-gray-900 rounded-xl flex items-center justify-center">
        <span className="text-gray-600 text-xs">Camera off</span>
      </div>
    )
  }

  return (
    <div className="relative w-40 h-28">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover rounded-xl bg-gray-900"
      />
      <div className={`absolute bottom-2 left-2 flex items-center gap-1`}>
        <span className={`w-2 h-2 rounded-full ${faceVisible ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs text-gray-300">{faceVisible ? 'Face detected' : 'No face'}</span>
      </div>
    </div>
  )
}
