import { useNavigate } from 'react-router-dom'
import useSessionStore from '../store/sessionStore'

export default function Report() {
  const navigate = useNavigate()
  const { report, sessionConfig, reset } = useSessionStore()

  function handleNewInterview() {
    reset()
    navigate('/setup')
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Generating your report...</div>
          <div className="text-xs text-gray-600">This takes about 15-20 seconds</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Interview Report</h1>
        <button
          onClick={handleNewInterview}
          className="px-5 py-2 bg-white text-gray-950 rounded-lg text-sm font-semibold hover:bg-gray-100"
        >
          New Interview
        </button>
      </div>

      {sessionConfig && (
        <p className="text-gray-500 text-sm mb-8">
          {sessionConfig.mode === 'tech' ? 'Tech' : 'HR'} Interview · {sessionConfig.role} · {sessionConfig.seniority} · {sessionConfig.difficulty}
        </p>
      )}

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Object.entries(report.scores || {}).map(([key, val]) => (
          <ScoreCard key={key} label={key} score={val} />
        ))}
      </div>

      {/* Strengths */}
      {report.strengths?.length > 0 && (
        <Section title="Strengths" items={report.strengths} color="green" />
      )}

      {/* Weaknesses */}
      {report.weaknesses?.length > 0 && (
        <Section title="Areas to Improve" items={report.weaknesses} color="red" />
      )}

      {/* Improvements */}
      {report.improvements?.length > 0 && (
        <Section title="Actionable Suggestions" items={report.improvements} color="blue" />
      )}

      {/* Answer breakdown */}
      {report.answer_breakdown?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Answer Breakdown</h2>
          <div className="flex flex-col gap-4">
            {report.answer_breakdown.map((item, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Q{i + 1}: {item.question}</p>
                <p className="text-sm text-gray-200 mb-2">{item.answer}</p>
                {item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreCard({ label, score }) {
  const pct = Math.round((score / 10) * 100)
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-sm font-semibold">{score}/10</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full">
        <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Section({ title, items, color }) {
  const colors = { green: 'text-green-400', red: 'text-red-400', blue: 'text-blue-400' }
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className={`text-sm ${colors[color]} flex gap-2`}>
            <span>•</span><span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
