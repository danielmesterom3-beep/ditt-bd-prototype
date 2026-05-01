import { useState } from 'react'
import type { Deal, DealStage } from '../types'

const STAGES: { id: DealStage; label: string; color: string; bg: string }[] = [
  { id: 'lead', label: 'Lead', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'gekwalificeerd', label: 'Gekwalificeerd', color: 'text-sky-700', bg: 'bg-sky-100' },
  { id: 'voorstel', label: 'Voorstel', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  { id: 'onderhandeling', label: 'Onderhandeling', color: 'text-violet-700', bg: 'bg-violet-100' },
  { id: 'gewonnen', label: 'Gewonnen', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  { id: 'verloren', label: 'Verloren', color: 'text-red-600', bg: 'bg-red-100' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface PipelineProps {
  deals: Deal[]
  onStageChange: (dealId: string, stage: DealStage) => void
}

export default function Pipeline({ deals, onStageChange }: PipelineProps) {
  const [selected, setSelected] = useState<Deal | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<DealStage | null>(null)

  const byStage = (stage: DealStage) => deals.filter((d) => d.stage === stage)

  function handleDrop(stage: DealStage) {
    if (dragId) onStageChange(dragId, stage)
    setDragId(null)
    setDragOver(null)
  }

  const stage = selected ? STAGES.find((s) => s.id === selected.stage) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((s) => {
            const cols = byStage(s.id)
            const total = cols.reduce((acc, d) => acc + d.value, 0)
            const isOver = dragOver === s.id

            return (
              <div
                key={s.id}
                className={`w-52 shrink-0 rounded-xl border transition-colors ${
                  isOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(s.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(s.id)}
              >
                <div className="px-3 py-2.5 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                      {cols.length}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="text-[11px] text-slate-400">{fmt(total)}</div>
                  )}
                </div>

                <div className="p-2 flex flex-col gap-2 min-h-24">
                  {cols.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragId(deal.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null) }}
                      onClick={() => setSelected(deal)}
                      className={`bg-white rounded-lg border border-slate-200 p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-300 transition-all select-none ${
                        dragId === deal.id ? 'opacity-40' : ''
                      } ${selected?.id === deal.id ? 'border-indigo-400 ring-1 ring-indigo-300' : ''}`}
                    >
                      <div className="font-medium text-slate-800 text-sm leading-tight truncate">{deal.company}</div>
                      <div className="text-slate-400 text-xs truncate mt-0.5">{deal.contact}</div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-slate-700 text-xs font-semibold">{fmt(deal.value)}</span>
                        <span className="text-slate-400 text-[11px]">{deal.sqm} m²</span>
                      </div>
                      <div className="mt-2 bg-slate-100 rounded-full h-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full transition-all"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{deal.probability}% kans</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && stage && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-slate-800">{selected.company}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage.bg} ${stage.color}`}>
                  {stage.label}
                </span>
              </div>
              <div className="text-slate-500 text-sm">{selected.contact} · {selected.location}</div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Waarde', value: fmt(selected.value) },
              { label: 'Oppervlak', value: `${selected.sqm} m²` },
              { label: 'Verwachte close', value: selected.expectedClose },
              { label: 'Kans', value: `${selected.probability}%` },
            ].map((f) => (
              <div key={f.label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{f.label}</div>
                <div className="font-semibold text-slate-700">{f.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Notities</div>
            <div className="text-sm text-slate-700">{selected.notes}</div>
          </div>

          <div className="flex gap-2 mt-4">
            <select
              value={selected.stage}
              onChange={(e) => {
                onStageChange(selected.id, e.target.value as DealStage)
                setSelected({ ...selected, stage: e.target.value as DealStage })
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
