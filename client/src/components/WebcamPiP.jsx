import { useEffect, useRef } from 'react'
import useSessionStore from '../store/sessionStore'
import { useMediaPipe } from '../hooks/useMediaPipe'

export default function WebcamPiP() {
  const videoRef = useRef(null)
  const { camActive, faceVisible, setCamActive, addDegradedService, removeDegradedService } = useSessionStore()

  useMediaPipe(videoRef)

  useEffect(() => {
    if (!camActive) return
    let stream = null

    async function startCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) videoRef.current.srcObject = stream
        removeDegradedService('camera')

        // Detect if the track ends unexpectedly (e.g. camera unplugged)
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            console.warn('[webcam] track ended — switching to audio-only')
            setCamActive(false)
            addDegradedService('camera')
          }
        })
      } catch (err) {
        console.warn('[webcam] failed to start:', err.message)
        setCamActive(false)
        addDegradedService('camera')
      }
    }

    startCam()
    return () => stream?.getTracks().forEach((t) => t.stop())
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
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${faceVisible ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs text-gray-300">{faceVisible ? 'Face detected' : 'No face'}</span>
      </div>
    </div>
  )
}
