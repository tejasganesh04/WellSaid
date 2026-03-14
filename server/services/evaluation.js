import axios from 'axios'

const EVALUATION_URL = process.env.EVALUATION_URL || 'http://localhost:8003'
const TIMEOUT_MS = 30000  // evaluation can take longer

export async function generateReport({ conversationHistory, sessionConfig, behavioralFlags }) {
  const response = await axios.post(
    `${EVALUATION_URL}/generate-report`,
    { conversation_history: conversationHistory, session_config: sessionConfig, behavioral_flags: behavioralFlags },
    { timeout: TIMEOUT_MS }
  )
  return response.data
}
