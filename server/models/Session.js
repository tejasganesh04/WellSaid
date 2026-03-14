import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['interviewer', 'candidate'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

const sessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  config: {
    mode: { type: String, enum: ['tech', 'hr'], required: true },
    role: String,
    seniority: String,
    difficulty: String,
    focusAreas: [String],
    coachEnabled: Boolean,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated_early'],
    default: 'active',
  },
  behavioral_flags: {
    off_topic_count: { type: Number, default: 0 },
    vague_count: { type: Number, default: 0 },
    disrespect_count: { type: Number, default: 0 },
    warned: { type: Boolean, default: false },
    terminated_early: { type: Boolean, default: false },
  },
  conversation_history: [messageSchema],
  created_at: { type: Date, default: Date.now },
  ended_at: Date,
})

export default mongoose.model('Session', sessionSchema)
