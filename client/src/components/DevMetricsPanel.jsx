import { useState, useEffect } from 'react'
import useSessionStore from '../store/sessionStore'

export default function DevMetricsPanel() {
  const [open, setOpen] = useState(false)
  const { latencyMetrics } = useSessionStore()

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {open ? '▾' : '▸'} Dev Metrics {latencyMetrics ? `(last: ${latencyMetrics.total_ms}ms)` : ''}
      </button>

      {open && (
        <div className="px-4 pb-4 font-mono text-xs text-gray-500 flex flex-col gap-1">
          {!latencyMetrics && <span>No data yet — complete an answer to see timings.</span>}
          {latencyMetrics && Object.entries(latencyMetrics).map(([key, val]) => (
            <div key={key} className="flex justify-between gap-4">
              <span className="text-gray-600">{key.replace(/_/g, ' ')}</span>
              <span className={key.includes('total') ? 'text-white' : 'text-gray-400'}>
                {typeof val === 'number' ? `${val}ms` : String(val)}
              </span>
            </div>
          ))}
          <div className="mt-2 text-gray-700 text-xs">Ctrl+Shift+D to toggle</div>
        </div>
      )}
    </div>
  )
}
