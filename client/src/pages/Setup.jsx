import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSessionStore from '../store/sessionStore'

const ROLES = ['Software Engineer', 'Backend Developer', 'Frontend Developer', 'AIML Engineer', 'Data Analyst', 'Full Stack Developer']
const LEVELS = ['Intern / Fresher', 'Junior', 'Mid-level', 'Senior']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const FOCUS_AREAS = ['DSA', 'Backend', 'Frontend', 'System Design', 'DBMS', 'Operating Systems', 'AI/ML', 'Projects', 'Behavioral', 'Leadership', 'Teamwork', 'Conflict Resolution']

export default function Setup() {
  const navigate = useNavigate()
  const setSessionConfig = useSessionStore((s) => s.setSessionConfig)

  const [form, setForm] = useState({
    mode: 'tech',
    role: 'Software Engineer',
    seniority: 'Mid-level',
    difficulty: 'Medium',
    focusAreas: [],
    coachEnabled: true,
  })

  function toggleFocus(area) {
    setForm((f) => ({
      ...f,
      focusAreas: f.focusAreas.includes(area)
        ? f.focusAreas.filter((a) => a !== area)
        : [...f.focusAreas, area],
    }))
  }

  function handleStart() {
    setSessionConfig(form)
    navigate('/device-check')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Configure your interview</h1>

      {/* Mode */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Interview Mode</label>
        <div className="flex gap-3">
          {['tech', 'hr'].map((m) => (
            <button
              key={m}
              onClick={() => setForm((f) => ({ ...f, mode: m }))}
              className={`px-5 py-2 rounded-lg font-medium capitalize transition-colors ${form.mode === m ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {m === 'tech' ? 'Tech Interview' : 'HR Interview'}
            </button>
          ))}
        </div>
      </div>

      {/* Role */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Target Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Seniority */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Seniority Level</label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setForm((f) => ({ ...f, seniority: l }))}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${form.seniority === l ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${form.difficulty === d ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Areas */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Focus Areas <span className="text-gray-600">(optional)</span></label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => toggleFocus(a)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${form.focusAreas.includes(a) ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Coach toggle */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => setForm((f) => ({ ...f, coachEnabled: !f.coachEnabled }))}
          className={`w-12 h-6 rounded-full transition-colors relative ${form.coachEnabled ? 'bg-white' : 'bg-gray-700'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-gray-950 transition-all ${form.coachEnabled ? 'left-7' : 'left-1'}`} />
        </button>
        <span className="text-sm text-gray-300">Live coaching {form.coachEnabled ? 'enabled' : 'disabled'}</span>
      </div>

      <button
        onClick={handleStart}
        className="w-full py-3 bg-white text-gray-950 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}
