import { useState } from 'react'
import { useNavigation } from '../context/NavigationContext'
import { useAllSteden } from '../context/CustomStedenContext'
import type { Stad } from '../data/types'
import BronTooltip from '../components/BronTooltip'
import EditableText from '../components/EditableText'

// JLL data

const JLL_KWARTALEN = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'] as const
type JllKwartaal = typeof JLL_KWARTALEN[number]

type JllRecord = {
  takeUp: string
  takeUpSub: string
  vacancy: string
  vacancySub: string
  primeRent: string
  investVolume: string
  investSub: string
  bron: string
}

const BLANK: JllRecord = { takeUp: '', takeUpSub: '', vacancy: '', vacancySub: '', primeRent: '', investVolume: '', investSub: '', bron: '' }

const JLL_DATA: Record<string, Record<JllKwartaal, JllRecord>> = {
  eindhoven: {
    'Q4 2025': { takeUp: '25,3k m²', takeUpSub: 'JLL Q4 2025', vacancy: '6,7%', vacancySub: 'JLL Q4 2025', primeRent: '€265/m²', investVolume: '€66,1M',  investSub: '2025 totaal', bron: 'JLL. (2026). Eindhoven Office Market Update Q4 2025. Jones Lang LaSalle IP, Inc.' },
    'Q1 2026': { takeUp: '3,3k m²',  takeUpSub: 'JLL Q1 2026', vacancy: '6,8%', vacancySub: 'JLL Q1 2026', primeRent: '€265/m²', investVolume: '€39,3M',  investSub: 'YTD 2026',    bron: 'JLL. (2026). Eindhoven Office Market Update Q1 2026. Jones Lang LaSalle IP, Inc.' },
    'Q2 2026': BLANK, 'Q3 2026': BLANK, 'Q4 2026': BLANK,
    'Q1 2027': BLANK, 'Q2 2027': BLANK, 'Q3 2027': BLANK, 'Q4 2027': BLANK,
  },
  rotterdam: {
    'Q4 2025': { takeUp: '54,5k m²', takeUpSub: 'JLL Q4 2025', vacancy: '6,1%', vacancySub: 'JLL Q4 2025', primeRent: '€360/m²', investVolume: '€276M',   investSub: '2025 totaal', bron: 'JLL. (2026). Rotterdam Office Market Update Q4 2025. Jones Lang LaSalle IP, Inc.' },
    'Q1 2026': { takeUp: '13,0k m²', takeUpSub: 'JLL Q1 2026', vacancy: '5,8%', vacancySub: 'JLL Q1 2026', primeRent: '€360/m²', investVolume: '€25,9M',  investSub: 'YTD 2026',    bron: 'JLL. (2026). Rotterdam Office Market Update Q1 2026. Jones Lang LaSalle IP, Inc.' },
    'Q2 2026': BLANK, 'Q3 2026': BLANK, 'Q4 2026': BLANK,
    'Q1 2027': BLANK, 'Q2 2027': BLANK, 'Q3 2027': BLANK, 'Q4 2027': BLANK,
  },
}

const VRAGEN = [
  'Hoe benader je A-locaties anders dan B/C?',
  'Pas je de pitch aan per locatieklasse?',
  'Welke producten stel je voor per contacttype?',
]

function berekenKPIs(stad: Stad) {
  const partijen = stad.gebieden.flatMap((g) => g.partijen)
  return {
    totaal: partijen.length,
    koud: partijen.filter((p) => p.contactStatus === 'koud').length,
    warm: partijen.filter((p) => p.contactStatus === 'warm').length,
    actief: partijen.filter((p) => p.contactStatus === 'actief').length,
  }
}

const KPI_CONFIG = [
  { key: 'totaal' as const, label: 'Totaal',  dot: 'bg-slate-400',   val: 'text-slate-700', bg: 'bg-white' },
  { key: 'koud'   as const, label: 'Koud',    dot: 'bg-slate-300',   val: 'text-slate-500', bg: 'bg-white' },
  { key: 'warm'   as const, label: 'Warm',    dot: 'bg-amber-400',   val: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'actief' as const, label: 'Actief',  dot: 'bg-emerald-500', val: 'text-emerald-700', bg: 'bg-emerald-50' },
]

function StadCard({
  stad,
  jllKwartaal,
  cycleKwartaal,
}: {
  stad: Stad
  jllKwartaal: JllKwartaal
  cycleKwartaal: (dir: 1 | -1) => void
}) {
  const { setStad } = useNavigation()
  const kpis = berekenKPIs(stad)
  const jll = JLL_DATA[stad.id]?.[jllKwartaal]

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Klikbaar bovenste deel */}
      <button
        onClick={() => setStad(stad)}
        className="group w-full text-left p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">
            {stad.naam}
          </h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">
            {stad.gebieden.length} gebieden
          </span>
        </div>

        {jll && (
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              JLL Office · {jllKwartaal}
            </span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4">
          {KPI_CONFIG.map(({ key, label, dot, val, bg }) => (
            <div key={key} className={`${bg} rounded-lg px-2 py-2 text-center`}>
              <div className={`text-xl font-semibold ${val}`}>{kpis[key]}</div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Bekijk gebieden →
          </span>
        </div>
      </button>

      {/* JLL sectie */}
      {jll && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                JLL Office · {jllKwartaal}
              </span>
              <BronTooltip bron={jll.bron} />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => cycleKwartaal(-1)}
                className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                style={{ cursor: 'pointer', background: 'none', border: '1px solid #e2e8f0' }}
              >
                ‹
              </button>
              <button
                onClick={() => cycleKwartaal(1)}
                className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                style={{ cursor: 'pointer', background: 'none', border: '1px solid #e2e8f0' }}
              >
                ›
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { labelKey: 'takeup.label',   labelDef: 'Take-up',        valueKey: 'takeup',   valueDef: jll.takeUp,      sub: jll.takeUpSub    },
              { labelKey: 'vacancy.label',  labelDef: 'Vacancy Rate',   valueKey: 'vacancy',  valueDef: jll.vacancy,     sub: jll.vacancySub   },
              { labelKey: 'prent.label',    labelDef: 'Prime Rent',     valueKey: 'prent',    valueDef: jll.primeRent,   sub: 'per jaar'       },
              { labelKey: 'invest.label',   labelDef: 'Investment Vol.', valueKey: 'invest',  valueDef: jll.investVolume,sub: jll.investSub    },
            ].map(({ labelKey, labelDef, valueKey, valueDef, sub }) => {
              const base = `jll.${stad.id}.${jllKwartaal}.${valueKey}`
              return (
                <div key={base}>
                  <div className="flex items-center gap-0.5 mb-1">
                    <EditableText
                      storageKey={`${base}.${labelKey}`}
                      defaultValue={labelDef}
                      className="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                    />
                    <BronTooltip bron={jll.bron} />
                  </div>
                  <div className="text-base font-bold text-slate-800">
                    <EditableText storageKey={base} defaultValue={valueDef} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardView() {
  const { allSteden: steden } = useAllSteden()
  const allePartijen = steden.flatMap((s) => s.gebieden.flatMap((g) => g.partijen))
  const totaalKPIs = {
    totaal: allePartijen.length,
    koud:   allePartijen.filter((p) => p.contactStatus === 'koud').length,
    warm:   allePartijen.filter((p) => p.contactStatus === 'warm').length,
    actief: allePartijen.filter((p) => p.contactStatus === 'actief').length,
  }

  const [jllKwartaal, setJllKwartaal] = useState<JllKwartaal>('Q4 2025')

  function cycleKwartaal(dir: 1 | -1) {
    setJllKwartaal((prev) => {
      const idx = JLL_KWARTALEN.indexOf(prev)
      return JLL_KWARTALEN[(idx + dir + JLL_KWARTALEN.length) % JLL_KWARTALEN.length]
    })
  }

  const [checked, setChecked] = useState<boolean[]>(VRAGEN.map(() => false))
  const aantalAfgevinkt = checked.filter(Boolean).length

  function toggleVraag(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Globale KPI's over alle steden */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map(({ key, label, dot, val, bg }) => (
          <div key={key} className={`${bg} rounded-xl border border-slate-200 shadow-sm px-5 py-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <div className={`text-3xl font-semibold ${val}`}>{totaalKPIs[key]}</div>
          </div>
        ))}
      </div>

      {/* Stedenkaarten */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Steden
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {steden.map((stad) => (
            <StadCard key={stad.id} stad={stad} jllKwartaal={jllKwartaal} cycleKwartaal={cycleKwartaal} />
          ))}
        </div>
      </div>

      {/* Testmoment card */}
      <div className="bg-indigo-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300 mb-1">
              Testmoment
            </div>
            <h3 className="text-base font-semibold">Interview Michiel Bijmols</h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            aantalAfgevinkt === VRAGEN.length
              ? 'bg-emerald-500 text-white'
              : 'bg-indigo-700 text-indigo-200'
          }`}>
            {aantalAfgevinkt}/{VRAGEN.length} klaar
          </span>
        </div>

        <p className="text-indigo-300 text-xs mb-5">
          Gebruik deze vragen als leidraad tijdens het testgesprek met Michiel.
        </p>

        <ul className="flex flex-col gap-3">
          {VRAGEN.map((vraag, i) => (
            <li key={i} className="flex items-start gap-3">
              <button
                onClick={() => toggleVraag(i)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                  checked[i]
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-indigo-500 hover:border-emerald-400'
                }`}
              >
                {checked[i] && <span className="text-[10px] leading-none">✓</span>}
              </button>
              <span className={`text-sm leading-snug transition-colors ${
                checked[i] ? 'text-indigo-400 line-through' : 'text-indigo-100'
              }`}>
                {vraag}
              </span>
            </li>
          ))}
        </ul>

        {aantalAfgevinkt === VRAGEN.length && (
          <div className="mt-5 pt-4 border-t border-indigo-700 text-xs text-emerald-400 font-medium">
            ✓ Alle vragen behandeld. Testmoment afgerond.
          </div>
        )}
      </div>
    </div>
  )
}
