import type { Deal, Activity } from '../types'
import KPICards from './KPICards'

const TYPE_ICON: Record<Activity['type'], string> = {
  call: '📞', email: '✉️', meeting: '👥', note: '📝', tour: '🏢',
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead',
  gekwalificeerd: 'Gekwalificeerd',
  voorstel: 'Voorstel',
  onderhandeling: 'Onderhandeling',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
}

const STAGE_COLOR: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-600',
  gekwalificeerd: 'bg-sky-100 text-sky-700',
  voorstel: 'bg-indigo-100 text-indigo-700',
  onderhandeling: 'bg-violet-100 text-violet-700',
  gewonnen: 'bg-emerald-100 text-emerald-700',
  verloren: 'bg-red-100 text-red-600',
}

interface DashboardOverviewProps {
  deals: Deal[]
  activities: Activity[]
  onToggle: (id: string) => void
}

export default function DashboardOverview({ deals, activities, onToggle }: DashboardOverviewProps) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = activities
    .filter((a) => !a.done && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const hotDeals = deals
    .filter((d) => d.stage !== 'gewonnen' && d.stage !== 'verloren')
    .sort((a, b) => (b.value * b.probability) - (a.value * a.probability))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot deals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Top deals</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gesorteerd op gewogen waarde</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {hotDeals.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">{d.company}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{d.contact} · {d.location}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-700">{fmt(d.value)}</div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STAGE_COLOR[d.stage]}`}>
                    {STAGE_LABEL[d.stage]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Upcoming activities */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Komende activiteiten</h3>
            <p className="text-xs text-slate-400 mt-0.5">Openstaand, oplopend op datum</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {upcoming.length === 0 && (
              <li className="px-5 py-8 text-center text-slate-400 text-sm">Geen openstaande activiteiten.</li>
            )}
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <button
                  onClick={() => onToggle(a.id)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-400 shrink-0 transition-colors cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">{a.description}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.company} · {a.contact}</div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {TYPE_ICON[a.type]} {a.date}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
