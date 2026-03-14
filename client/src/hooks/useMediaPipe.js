import { useEffect, useRef, useCallback } from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import useSessionStore from '../store/sessionStore'

const ANALYSIS_INTERVAL_MS = 800   // run face detection every 800ms
const COACH_COOLDOWN_MS = 10000    // don't repeat same visual hint within 10s

export function useMediaPipe(videoRef) {
  const detectorRef = useRef(null)
  const intervalRef = useRef(null)
  const lastHintTime = useRef({})
  const isInitialized = useRef(false)

  const { setFaceVisible, addCoachCard, coachEnabled, sessionStatus, camActive } = useSessionStore()

  function canFire(key) {
    return Date.now() - (lastHintTime.current[key] || 0) > COACH_COOLDOWN_MS
  }

  function fireVisualHint(key, text) {
    if (!coachEnabled || !canFire(key)) return
    lastHintTime.current[key] = Date.now()
    addCoachCard({ text, type: 'delivery' })
  }

  const initDetector = useCallback(async () => {
    if (isInitialized.current) return
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      )
      detectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
      })
      isInitialized.current = true
      console.log('[mediapipe] face detector ready')
    } catch (err) {
      console.warn('[mediapipe] failed to init, visual coaching disabled:', err.message)
    }
  }, [])

  const runDetection = useCallback(() => {
    if (!detectorRef.current || !videoRef.current || !isInitialized.current) return
    const video = videoRef.current
    if (video.readyState < 2) return  // video not ready yet

    try {
      const result = detectorRef.current.detectForVideo(video, Date.now())
      const faces = result.detections || []

      if (faces.length === 0) {
        setFaceVisible(false)
        fireVisualHint('no_face', 'Make sure your face is visible')
        return
      }

      setFaceVisible(true)
      const face = faces[0]
      const box = face.boundingBox

      if (!box) return

      // Eye contact proxy: is the face roughly centered horizontally?
      const videoW = video.videoWidth || 640
      const faceCenter = box.originX + box.width / 2
      const normalizedX = faceCenter / videoW  // 0 = left, 1 = right, ~0.5 = center
      if (normalizedX < 0.25 || normalizedX > 0.75) {
        fireVisualHint('looking_away', 'Try to look directly at the camera')
      }

      // Face too small = too far from camera
      const faceAreaRatio = (box.width * box.height) / (video.videoWidth * video.videoHeight)
      if (faceAreaRatio < 0.03) {
        fireVisualHint('too_far', 'Move a little closer to the camera')
      }

    } catch (err) {
      // Detection errors are silent — visual coaching just pauses
    }
  }, [coachEnabled, setFaceVisible, addCoachCard])

  // Initialize when session becomes active
  useEffect(() => {
    if (sessionStatus === 'active' && camActive) {
      initDetector()
    }
  }, [sessionStatus, camActive])

  // Run detection loop
  useEffect(() => {
    if (sessionStatus === 'active' && camActive && isInitialized.current) {
      intervalRef.current = setInterval(runDetection, ANALYSIS_INTERVAL_MS)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [sessionStatus, camActive, runDetection])

  // Retry starting the interval once detector initializes
  useEffect(() => {
    if (!isInitialized.current) return
    if (sessionStatus === 'active' && camActive) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(runDetection, ANALYSIS_INTERVAL_MS)
    }
  }, [isInitialized.current])
}
