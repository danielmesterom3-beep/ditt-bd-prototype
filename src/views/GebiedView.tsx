import { useState } from 'react'
import type { Gebied, LocatieKlasse } from '../data/types'
import { useNavigation } from '../context/NavigationContext'
import EditableText, { getEditableText } from '../components/EditableText'

// ── Design & Build Netwerk data ───────────────────────────────────────────────

type DBPartner = { naam: string; type: string; partner: boolean }

const DB_NETWERK: Record<string, { design: DBPartner[]; build: DBPartner[] }> = {
  Rotterdam: {
    design: [
      { naam: 'StudioOK',           type: 'Interieurarchitectuur',    partner: false },
      { naam: 'Switchs',            type: 'D&B coördinatie',          partner: false },
      { naam: 'Fokkema & Partners', type: 'Interieurarchitectuur',    partner: true  },
    ],
    build: [
      { naam: 'De Vries en Verburg',  type: 'Aannemer',             partner: false },
      { naam: 'Pubblik&Vos',          type: 'Afbouw',               partner: false },
      { naam: 'A. De Jong Groep',     type: 'Installateur',         partner: false },
      { naam: 'Nornorm',              type: 'Circulair meubilair',  partner: false },
      { naam: 'Kantorice',            type: 'Projectinrichter',     partner: false },
      { naam: 'Flex Projects',        type: 'Uitvoering',           partner: false },
      { naam: 'BEUK',                 type: 'Sloper',               partner: true  },
      { naam: 'CT Sloop',             type: 'Sloper',               partner: true  },
      { naam: 'BigBrands',            type: 'Projectmeubilair',     partner: true  },
      { naam: 'Unica',                type: 'Installateur',         partner: true  },
      { naam: 'EQUANS',               type: 'Installateur',         partner: true  },
      { naam: 'Croonwolter&dros',     type: 'Installateur',         partner: true  },
      { naam: 'Homij',                type: 'Installateur',         partner: true  },
      { naam: 'Bovero',               type: 'Vloeren',              partner: true  },
      { naam: 'Windside Digital',     type: 'AV & signage',         partner: true  },
      { naam: 'EeStairs',             type: 'Trappen',              partner: true  },
    ],
  },
  Eindhoven: {
    design: [
      { naam: 'BuroBas',                  type: 'Interieurarchitectuur', partner: false },
      { naam: 'Ininterieurs',             type: 'Projectinrichter',      partner: false },
      { naam: 'Totaal Kantoorinrichting', type: 'Projectinrichter',      partner: false },
      { naam: 'VB Vastgoedinrichter',     type: 'Projectinrichter',      partner: false },
      { naam: 'Den Bak Projecten',        type: 'Projectinrichter',      partner: false },
      { naam: 'PGA / Markt Projecten',    type: 'Projectinrichter',      partner: false },
    ],
    build: [
      { naam: 'Goevaars Bouwonderneming',  type: 'Aannemer',                   partner: false },
      { naam: 'Stam + De Koning Bouw',     type: 'Aannemer (VolkersWessels)',   partner: false },
      { naam: 'LK',                        type: 'Aannemer',                   partner: false },
      { naam: 'Afbouw AMB',                type: 'Afbouwer',                   partner: false },
      { naam: 'VolkersWessels',            type: 'Bouwconcern',                partner: false },
      { naam: 'Ahrend',                    type: 'Projectinrichter',            partner: true  },
      { naam: 'Hoppenbrouwers Techniek',   type: 'Installateur',               partner: true  },
      { naam: 'Unica',                     type: 'Installateur',               partner: true  },
      { naam: 'EQUANS',                    type: 'Installateur',               partner: true  },
      { naam: 'Croonwolter&dros',          type: 'Installateur',               partner: true  },
      { naam: 'Homij',                     type: 'Installateur',               partner: true  },
      { naam: 'Bovero',                    type: 'Vloeren',                    partner: true  },
      { naam: 'Windside Digital',          type: 'AV & signage',               partner: true  },
      { naam: 'EeStairs',                  type: 'Trappen',                    partner: true  },
    ],
  },
}

function DesignBouwKaart({ stadNaam }: { stadNaam: string }) {
  const [tab, setTab] = useState<'design' | 'build'>('design')
  const data = DB_NETWERK[stadNaam]
  if (!data) return null
  const lijst = data[tab]
  const nieuwePartijen = lijst.filter((p) => !p.partner)
  const bestaandePartners = lijst.filter((p) => p.partner)

  return (
    <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-800 text-base leading-tight">Design & Build Netwerk</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{stadNaam} · marktpartijen per discipline</p>
        </div>
        {/* Toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setTab('design')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === 'design'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            D  Design
          </button>
          <button
            onClick={() => setTab('build')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === 'build'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            B  Build
          </button>
        </div>
      </div>

      {/* Lijst — twee kolommen */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0 max-h-52 overflow-y-auto pr-1">
        {/* Nieuwe partijen eerst */}
        {nieuwePartijen.map((p) => (
          <div key={p.naam} className="flex items-center justify-between py-1.5 border-b border-slate-50">
            <div>
              <div className="text-[12px] font-medium text-slate-800">{p.naam}</div>
              <div className="text-[10px] text-slate-400">{p.type}</div>
            </div>
            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0 ml-2">
              prospect
            </span>
          </div>
        ))}
        {/* Bestaande Ditt-partners */}
        {bestaandePartners.map((p) => (
          <div key={p.naam} className="flex items-center justify-between py-1.5 border-b border-slate-50">
            <div>
              <div className="text-[12px] font-medium text-slate-700">{p.naam}</div>
              <div className="text-[10px] text-slate-400">{p.type}</div>
            </div>
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0 ml-2">
              partner
            </span>
          </div>
        ))}
      </div>

      {/* Footer telling */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
        <span className="text-[11px] text-slate-400">
          <span className="font-semibold text-amber-600">{nieuwePartijen.length}</span> prospect{nieuwePartijen.length !== 1 ? 'en' : ''}
        </span>
        <span className="text-[11px] text-slate-400">
          <span className="font-semibold text-emerald-600">{bestaandePartners.length}</span> partner{bestaandePartners.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

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
        <DesignBouwKaart stadNaam={geselecteerdeStad.naam} />
      </div>
    </div>
  )
}
