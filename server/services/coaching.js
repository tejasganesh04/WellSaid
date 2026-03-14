import axios from 'axios'

const COACHING_URL = process.env.COACHING_URL || 'http://localhost:8002'
const TIMEOUT_MS = 5000

export async function generateCoachingHint({ transcript, currentQuestion, sessionConfig }) {
  const response = await axios.post(
    `${COACHING_URL}/generate-hint`,
    { transcript, current_question: currentQuestion, session_config: sessionConfig },
    { timeout: TIMEOUT_MS }
  )
  return response.data
}
