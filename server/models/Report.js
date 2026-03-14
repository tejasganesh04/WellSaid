import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  scores: {
    overall: Number,
    communication: Number,
    structure: Number,
    relevance: Number,
    conciseness: Number,
    professionalism: Number,
  },
  strengths: [String],
  weaknesses: [String],
  improvements: [String],
  answer_breakdown: [
    {
      question: String,
      answer: String,
      score: Number,
      notes: String,
    },
  ],
  generated_at: { type: Date, default: Date.now },
})

export default mongoose.model('Report', reportSchema)
