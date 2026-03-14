import { create } from 'zustand'

const useSessionStore = create((set) => ({
  // Session config
  sessionId: null,
  sessionConfig: null,

  // Live interview state
  sessionStatus: 'idle',        // idle | active | ended | terminated_early
  currentQuestion: null,
  liveTranscript: '',
  coachingCards: [],
  coachEnabled: true,
  isInterviewerThinking: false,

  // Device state
  micActive: true,
  camActive: true,
  faceVisible: true,

  // Resilience / degraded state
  sttMode: 'deepgram',          // deepgram | webspeech | none
  connectionStatus: 'connected', // connected | reconnecting | disconnected
  degradedServices: [],          // ['stt', 'coaching', 'interviewer', 'camera']

  // Latency metrics
  latencyMetrics: null,

  // Post-session
  report: null,

  // Actions
  setSessionId: (id) => set({ sessionId: id }),
  setSessionConfig: (config) => set({ sessionConfig: config, coachEnabled: config.coachEnabled }),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  setCurrentQuestion: (question) => set({ currentQuestion: question, isInterviewerThinking: false }),
  setInterviewerThinking: (val) => set({ isInterviewerThinking: val }),
  appendTranscript: (text) => set((s) => ({ liveTranscript: s.liveTranscript + ' ' + text })),
  clearTranscript: () => set({ liveTranscript: '' }),
  addCoachCard: (card) => set((s) => ({
    coachingCards: [...s.coachingCards.slice(-3), { id: Date.now(), ...card }]
  })),
  dismissCoachCard: (id) => set((s) => ({
    coachingCards: s.coachingCards.filter((c) => c.id !== id)
  })),
  toggleCoach: () => set((s) => ({ coachEnabled: !s.coachEnabled })),
  setMicActive: (val) => set({ micActive: val }),
  setCamActive: (val) => set({ camActive: val }),
  setFaceVisible: (val) => set({ faceVisible: val }),
  setSttMode: (mode) => set({ sttMode: mode }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addDegradedService: (svc) => set((s) => ({
    degradedServices: s.degradedServices.includes(svc) ? s.degradedServices : [...s.degradedServices, svc]
  })),
  removeDegradedService: (svc) => set((s) => ({
    degradedServices: s.degradedServices.filter((s2) => s2 !== svc)
  })),
  setLatencyMetrics: (metrics) => set({ latencyMetrics: metrics }),
  setReport: (report) => set({ report }),

  reset: () => set({
    sessionId: null,
    sessionConfig: null,
    sessionStatus: 'idle',
    currentQuestion: null,
    liveTranscript: '',
    coachingCards: [],
    isInterviewerThinking: false,
    micActive: true,
    camActive: true,
    faceVisible: true,
    sttMode: 'deepgram',
    connectionStatus: 'connected',
    degradedServices: [],
    latencyMetrics: null,
    report: null,
  }),
}))

export default useSessionStore
