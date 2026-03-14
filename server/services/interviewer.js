import axios from 'axios'

const INTERVIEWER_URL = process.env.INTERVIEWER_URL || 'http://localhost:8001'
const TIMEOUT_MS = 8000

export async function generateQuestion({ sessionConfig, conversationHistory, behavioralFlags, latestAnswer }) {
  const response = await axios.post(
    `${INTERVIEWER_URL}/generate-question`,
    { session_config: sessionConfig, conversation_history: conversationHistory, behavioral_flags: behavioralFlags, latest_answer: latestAnswer },
    { timeout: TIMEOUT_MS }
  )
  return response.data
}
