import useSessionStore from '../store/sessionStore'

const TYPE_STYLES = {
  delivery: 'border-yellow-500/30 bg-yellow-500/5',
  semantic: 'border-blue-500/30 bg-blue-500/5',
  system:   'border-gray-500/30 bg-gray-500/5',
}

export default function CoachingSidebar() {
  const { coachingCards, coachEnabled, toggleCoach, dismissCoachCard } = useSessionStore()

  return (
    <div className="w-72 border-l border-gray-800 p-4 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Coach</p>
        <button
          onClick={toggleCoach}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${coachEnabled ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-400'}`}
        >
          {coachEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!coachEnabled && (
        <p className="text-gray-600 text-xs mt-2">Coaching is off. Toggle to enable.</p>
      )}

      {coachEnabled && coachingCards.length === 0 && (
        <p className="text-gray-600 text-xs mt-2">Coaching hints will appear here while you speak.</p>
      )}

      {coachEnabled && coachingCards.map((card) => (
        <div
          key={card.id}
          className={`rounded-xl border p-3 flex items-start justify-between gap-2 ${TYPE_STYLES[card.type] || TYPE_STYLES.semantic}`}
        >
          <p className="text-sm text-gray-200 leading-snug">{card.text}</p>
          <button
            onClick={() => dismissCoachCard(card.id)}
            className="text-gray-600 hover:text-gray-400 text-xs mt-0.5 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
