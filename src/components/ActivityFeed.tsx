import { useState } from 'react'
import type { Activity } from '../types'

const TYPE_META: Record<Activity['type'], { label: string; color: string; bg: string; icon: string }> = {
  call: { label: 'Bellen', color: 'text-sky-700', bg: 'bg-sky-100', icon: '📞' },
  email: { label: 'Email', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '✉️' },
  meeting: { label: 'Afspraak', color: 'text-violet-700', bg: 'bg-violet-100', icon: '👥' },
  note: { label: 'Notitie', color: 'text-slate-600', bg: 'bg-slate-100', icon: '📝' },
  tour: { label: 'Rondleiding', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '🏢' },
}

interface ActivityFeedProps {
  activities: Activity[]
  onToggle: (id: string) => void
}

export default function ActivityFeed({ activities, onToggle }: ActivityFeedProps) {
  const [filter, setFilter] = useState<'alle' | 'open' | 'gedaan'>('alle')

  const filtered = activities
    .filter((a) => {
      if (filter === 'open') return !a.done
      if (filter === 'gedaan') return a.done
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Activiteiten</h3>
        <div className="flex gap-1">
          {(['alle', 'open', 'gedaan'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full font-medium capitalize cursor-pointer transition-colors ${
                filter === f
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-slate-50">
        {filtered.length === 0 && (
          <li className="px-5 py-8 text-center text-slate-400 text-sm">Geen activiteiten gevonden.</li>
        )}
        {filtered.map((a) => {
          const meta = TYPE_META[a.type]
          const isOverdue = !a.done && a.date < today
          const isToday = a.date === today

          return (
            <li key={a.id} className={`flex items-start gap-4 px-5 py-4 ${a.done ? 'opacity-50' : ''}`}>
              <button
                onClick={() => onToggle(a.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-colors cursor-pointer flex items-center justify-center ${
                  a.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 hover:border-emerald-400'
                }`}
              >
                {a.done && <span className="text-[10px] leading-none">✓</span>}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-xs text-slate-400">{a.company}</span>
                </div>
                <p className={`text-sm ${a.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {a.description}
                </p>
                <div className="text-xs text-slate-400 mt-1">{a.contact}</div>
              </div>

              <div className={`text-xs font-medium shrink-0 ${
                a.done ? 'text-slate-400' : isOverdue ? 'text-red-500' : isToday ? 'text-amber-600' : 'text-slate-400'
              }`}>
                {isOverdue && !a.done ? 'Verlaat · ' : ''}
                {a.date}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
