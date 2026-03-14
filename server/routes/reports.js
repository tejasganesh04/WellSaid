import { Router } from 'express'
import Report from '../models/Report.js'

const router = Router()

// GET report by session ID
router.get('/:sessionId', async (req, res) => {
  try {
    const report = await Report.findOne({ session_id: req.params.sessionId })
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
