import { deals } from '../data'

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function KPICards() {
  const active = deals.filter((d) => d.stage !== 'gewonnen' && d.stage !== 'verloren')
  const won = deals.filter((d) => d.stage === 'gewonnen')
  const lost = deals.filter((d) => d.stage === 'verloren')

  const pipelineValue = active.reduce((s, d) => s + d.value * (d.probability / 100), 0)
  const totalPipeline = active.reduce((s, d) => s + d.value, 0)
  const wonValue = won.reduce((s, d) => s + d.value, 0)
  const conversionRate = deals.length > 0 ? Math.round((won.length / (won.length + lost.length || 1)) * 100) : 0

  const cards = [
    {
      label: 'Gewogen pipeline',
      value: fmt(pipelineValue),
      sub: `van ${fmt(totalPipeline)} totaal`,
      color: 'bg-indigo-50 text-indigo-700',
      dot: 'bg-indigo-500',
    },
    {
      label: 'Gewonnen (YTD)',
      value: fmt(wonValue),
      sub: `${won.length} deal${won.length !== 1 ? 's' : ''} gesloten`,
      color: 'bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    },
    {
      label: 'Actieve deals',
      value: String(active.length),
      sub: `${active.reduce((s, d) => s + d.sqm, 0)} m² in gesprek`,
      color: 'bg-sky-50 text-sky-700',
      dot: 'bg-sky-500',
    },
    {
      label: 'Conversieratio',
      value: `${conversionRate}%`,
      sub: `${won.length}/${won.length + lost.length} deals gewonnen`,
      color: 'bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${card.dot}`} />
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className="text-2xl font-semibold text-slate-800 mb-1">{card.value}</div>
          <div className="text-slate-400 text-xs">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
