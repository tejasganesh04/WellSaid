import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold tracking-tight">WellSaid</h1>
      <p className="text-gray-400 text-lg">Realtime AI mock interviews. Built different.</p>
      <button
        onClick={() => navigate('/setup')}
        className="px-8 py-3 bg-white text-gray-950 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
      >
        Start Interview
      </button>
    </div>
  )
}
