import { v4 as uuidv4 } from 'uuid'
import Session from '../models/Session.js'
import { generateQuestion } from '../services/interviewer.js'
import { generateCoachingHint } from '../services/coaching.js'
import { generateReport } from '../services/evaluation.js'

export function registerSocketHandlers(io, socket) {

  // Client starts a new session
  socket.on('session:start', async ({ sessionConfig }) => {
    try {
      const sessionId = uuidv4()
      socket.sessionId = sessionId

      // Save session to MongoDB
      const session = await Session.create({
        session_id: sessionId,
        config: sessionConfig,
        status: 'active',
        conversation_history: [],
        behavioral_flags: {
          off_topic_count: 0,
          vague_count: 0,
          disrespect_count: 0,
          warned: false,
          terminated_early: false,
        },
      })

      socket.emit('session:created', { sessionId })
      console.log(`[session] started: ${sessionId}`)

      // Ask the first question
      socket.emit('interviewer:thinking')
      const t0 = Date.now()

      const { question } = await generateQuestion({
        sessionConfig,
        conversationHistory: [],
        behavioralFlags: session.behavioral_flags,
        latestAnswer: null,
      })

      const latency = { interviewer_ms: Date.now() - t0 }
      socket.emit('interviewer:question', { question, latency })

      // Save first question to history
      await Session.findOneAndUpdate(
        { session_id: sessionId },
        { $push: { conversation_history: { role: 'interviewer', content: question, timestamp: new Date() } } }
      )
    } catch (err) {
      console.error('[session:start] error:', err.message)
      socket.emit('error', { message: 'Failed to start session' })
    }
  })

  // Client submits a completed answer
  socket.on('answer:complete', async ({ answer, transcript }) => {
    try {
      const sessionId = socket.sessionId
      if (!sessionId) return

      const t0 = Date.now()

      // Load session
      const session = await Session.findOne({ session_id: sessionId })
      if (!session) return

      // Save answer to history
      await Session.findOneAndUpdate(
        { session_id: sessionId },
        { $push: { conversation_history: { role: 'candidate', content: answer, timestamp: new Date() } } }
      )

      const updatedSession = await Session.findOne({ session_id: sessionId })

      // Fire coaching and next question in parallel
      const [coachResult, questionResult] = await Promise.allSettled([
        session.config.coachEnabled
          ? generateCoachingHint({
              transcript,
              currentQuestion: updatedSession.conversation_history.findLast((m) => m.role === 'interviewer')?.content,
              sessionConfig: session.config,
            })
          : Promise.resolve(null),
        generateQuestion({
          sessionConfig: session.config,
          conversationHistory: updatedSession.conversation_history,
          behavioralFlags: updatedSession.behavioral_flags,
          latestAnswer: answer,
        }),
      ])

      const latency = { total_ms: Date.now() - t0 }

      // Send coaching hint if available
      if (coachResult.status === 'fulfilled' && coachResult.value?.hint) {
        socket.emit('coach:hint', { hint: coachResult.value.hint, type: 'semantic' })
      }

      // Handle interviewer result
      if (questionResult.status === 'fulfilled') {
        const { question, terminated, terminationMessage, behavioralFlags } = questionResult.value

        // Update behavioral flags
        if (behavioralFlags) {
          await Session.findOneAndUpdate({ session_id: sessionId }, { behavioral_flags: behavioralFlags })
        }

        if (terminated) {
          // Interviewer decided to terminate
          await Session.findOneAndUpdate({ session_id: sessionId }, { status: 'terminated_early' })
          socket.emit('session:ended', { status: 'terminated_early', message: terminationMessage })
          await _generateAndSendReport(socket, sessionId)
        } else {
          socket.emit('interviewer:question', { question, latency })
          await Session.findOneAndUpdate(
            { session_id: sessionId },
            { $push: { conversation_history: { role: 'interviewer', content: question, timestamp: new Date() } } }
          )
        }
      } else {
        // Interviewer service failed — send a neutral fallback prompt
        console.error('[answer:complete] interviewer failed:', questionResult.reason)
        socket.emit('interviewer:question', {
          question: "Could you elaborate on that a bit more?",
          latency: { total_ms: Date.now() - t0 },
        })
      }
    } catch (err) {
      console.error('[answer:complete] error:', err.message)
    }
  })

  // Client ends session manually
  socket.on('session:end', async ({ sessionId }) => {
    try {
      const sid = sessionId || socket.sessionId
      if (!sid) return
      await Session.findOneAndUpdate({ session_id: sid }, { status: 'completed', ended_at: new Date() })
      socket.emit('session:ended', { status: 'completed' })
      await _generateAndSendReport(socket, sid)
    } catch (err) {
      console.error('[session:end] error:', err.message)
    }
  })
}

// Internal helper — generate report and emit it
async function _generateAndSendReport(socket, sessionId) {
  try {
    const session = await Session.findOne({ session_id: sessionId })
    if (!session) return
    const report = await generateReport({
      conversationHistory: session.conversation_history,
      sessionConfig: session.config,
      behavioralFlags: session.behavioral_flags,
    })
    socket.emit('report:ready', { report })
  } catch (err) {
    console.error('[report] generation failed:', err.message)
    socket.emit('report:ready', { report: null })
  }
}
