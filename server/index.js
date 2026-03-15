import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { registerSocketHandlers } from './socket/handlers.js'
import sessionRoutes from './routes/sessions.js'
import reportRoutes from './routes/reports.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
]

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// REST routes
app.use('/api/sessions', sessionRoutes)
app.use('/api/reports', reportRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`)
  registerSocketHandlers(io, socket)
  socket.on('disconnect', () => console.log(`[socket] client disconnected: ${socket.id}`))
})

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[db] MongoDB connected')
    const PORT = process.env.PORT || 5000
    httpServer.listen(PORT, () => console.log(`[server] running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('[db] MongoDB connection failed:', err.message)
    process.exit(1)
  })
