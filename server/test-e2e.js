/**
 * End-to-end socket test
 * Tests the full live interview loop:
 *   session:start → question arrives → answer:complete → follow-up → session:end → report:ready
 *
 * Run from server/ directory: node test-e2e.js
 */

import { io } from 'socket.io-client'

const SERVER = 'http://localhost:5000'
const TIMEOUT = 60_000

const sessionConfig = {
  mode: 'tech',
  role: 'Backend Engineer',
  seniority: 'mid',
  difficulty: 'medium',
  focusAreas: ['System Design', 'APIs'],
  coachEnabled: true,
}

let questionCount = 0
let sessionId = null

console.log('\n=== WellSaid End-to-End Socket Test ===\n')

const socket = io(SERVER, {
  reconnection: false,
  timeout: TIMEOUT,
})

const fail = (msg) => {
  console.error(`\n❌ FAIL: ${msg}`)
  socket.disconnect()
  process.exit(1)
}

const pass = (msg) => console.log(`✅ ${msg}`)

// ─── Safety timeout ──────────────────────────────────────────────────────────
const globalTimeout = setTimeout(() => fail('Test timed out after 60s'), TIMEOUT)

// ─── Connection ──────────────────────────────────────────────────────────────
socket.on('connect', () => {
  pass(`Connected to server (socket: ${socket.id})`)
  console.log('\n[1] Emitting session:start...')
  socket.emit('session:start', { sessionConfig })
})

socket.on('connect_error', (err) => fail(`Cannot connect to server: ${err.message}`))

// ─── Session created ─────────────────────────────────────────────────────────
socket.on('session:created', ({ sessionId: id }) => {
  sessionId = id
  pass(`Session created: ${sessionId}`)
})

// ─── Interviewer thinking ────────────────────────────────────────────────────
socket.on('interviewer:thinking', () => {
  console.log('   ⏳ Interviewer thinking...')
})

// ─── Question received ────────────────────────────────────────────────────────
socket.on('interviewer:question', ({ question, latency }) => {
  questionCount++
  pass(`Q${questionCount} received: "${question.slice(0, 80)}..."`)
  if (latency) console.log(`   Latency: ${JSON.stringify(latency)}`)

  if (questionCount === 1) {
    // Simulate answering Q1 with a realistic answer
    setTimeout(() => {
      console.log('\n[2] Emitting answer:complete (answer to Q1)...')
      socket.emit('answer:complete', {
        answer: 'I designed a REST API for a high-traffic e-commerce platform. I used Node.js with Express, implemented rate limiting and caching with Redis, and deployed it on AWS with horizontal scaling. The main challenge was handling 10,000 concurrent users during flash sales, which I solved with a queue-based architecture using BullMQ.',
        transcript: 'I designed a REST API for a high-traffic e-commerce platform. I used Node.js with Express, implemented rate limiting and caching with Redis.',
      })
    }, 500)
  } else if (questionCount === 2) {
    // After Q2, end the session
    setTimeout(() => {
      console.log('\n[3] Emitting session:end...')
      socket.emit('session:end', { sessionId })
    }, 500)
  }
})

// ─── Coach hints ─────────────────────────────────────────────────────────────
socket.on('coach:hint', ({ hint, type }) => {
  pass(`Coach hint (${type}): "${hint}"`)
})

// ─── Session ended ────────────────────────────────────────────────────────────
socket.on('session:ended', ({ status, message }) => {
  pass(`Session ended with status: ${status}`)
  if (message) console.log(`   Message: ${message}`)
  console.log('\n[4] Waiting for report (this takes ~15-20s)...')
})

// ─── Report ready ─────────────────────────────────────────────────────────────
socket.on('report:ready', ({ report }) => {
  if (!report) {
    fail('report:ready received but report is null')
    return
  }

  pass('Report received!')
  console.log('\n--- Report Summary ---')
  console.log('Scores:', JSON.stringify(report.scores, null, 2))
  console.log('Strengths:', report.strengths)
  console.log('Weaknesses:', report.weaknesses)
  console.log(`Answer breakdown: ${report.answer_breakdown?.length ?? 0} items`)

  clearTimeout(globalTimeout)
  console.log('\n✅✅✅ ALL TESTS PASSED ✅✅✅\n')
  socket.disconnect()
  process.exit(0)
})

// ─── Error ────────────────────────────────────────────────────────────────────
socket.on('error', ({ message }) => {
  fail(`Server error: ${message}`)
})
