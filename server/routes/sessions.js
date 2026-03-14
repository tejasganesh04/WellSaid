import { Router } from 'express'
import Session from '../models/Session.js'

const router = Router()

// GET all sessions (for dashboard)
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({}, 'session_id config status created_at ended_at')
      .sort({ created_at: -1 })
      .limit(20)
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single session
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ session_id: req.params.sessionId })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
