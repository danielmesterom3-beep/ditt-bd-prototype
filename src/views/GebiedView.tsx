import type { Gebied, LocatieKlasse } from '../data/types'
import { useNavigation } from '../context/NavigationContext'
import EditableText, { getEditableText } from '../components/EditableText'

const KLASSE_STYLE: Record<NonNullable<LocatieKlasse>, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-red-100 text-red-600',
}

function klasseVanGebied(gebied: Gebied): LocatieKlasse {
  const klassen = gebied.partijen
    .map((p) => p.locatieKlasse)
    .filter((k): k is NonNullable<LocatieKlasse> => k !== null)
  if (klassen.length === 0) return null
  const telling = klassen.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(telling).sort((a, b) => b[1] - a[1])[0][0] as NonNullable<LocatieKlasse>
}

const TYPE_LABELS: Record<string, string> = {
  makelaar: 'Makelaars',
  eigenaar: 'Eigenaren',
  huurder: 'Huurders',
}

export default function GebiedView() {
  const { geselecteerdeStad, setGebied, terug } = useNavigation()

  if (!geselecteerdeStad) return null

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={terug}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-fit"
      >
        ← Terug naar steden
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {geselecteerdeStad.gebieden.map((gebied) => {
          const klasse = klasseVanGebied(gebied)
          const tellingPerType = ['makelaar', 'eigenaar', 'huurder'].map((type) => ({
            type,
            label: TYPE_LABELS[type],
            count: gebied.partijen.filter((p) => p.type === type).length,
          }))
          const statusTelling = {
            koud:   gebied.partijen.filter((p) => p.contactStatus === 'koud').length,
            warm:   gebied.partijen.filter((p) => p.contactStatus === 'warm').length,
            actief: gebied.partijen.filter((p) => p.contactStatus === 'actief').length,
          }

          return (
            <button
              key={gebied.id}
              onClick={() => setGebied(gebied)}
              className="group text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-semibold text-slate-800 text-base leading-tight pr-2 group-hover:text-indigo-700 transition-colors">
                  <EditableText
                    storageKey={`gebied.${gebied.id}.naam`}
                    defaultValue={getEditableText(`gebied.${gebied.id}.naam`, gebied.naam) || 'Naamloos gebied'}
                  />
                </h2>
                {klasse ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${KLASSE_STYLE[klasse]}`}>
                    {klasse}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                 , 
                  </span>
                )}
              </div>

              <div className="flex gap-3 mb-4">
                {tellingPerType.map(({ type, label, count }) => (
                  <div key={type} className="flex-1 bg-slate-50 rounded-lg px-2 py-2 text-center">
                    <div className="text-lg font-semibold text-slate-700">{count}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Contactstatus</div>
                <div className="flex gap-1.5">
                  {[
                    { key: 'koud',   label: 'Koud',   color: 'bg-slate-200', text: 'text-slate-500' },
                    { key: 'warm',   label: 'Warm',   color: 'bg-amber-300', text: 'text-amber-700' },
                    { key: 'actief', label: 'Actief', color: 'bg-emerald-400', text: 'text-emerald-700' },
                  ].map(({ key, label, color, text }) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className={`text-[11px] font-medium ${text}`}>
                        {statusTelling[key as keyof typeof statusTelling]} {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {gebied.partijen.length} partij{gebied.partijen.length !== 1 ? 'en' : ''}
                </span>
                <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Bekijk →
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
