import { useState } from 'react'
import { useNavigation } from '../context/NavigationContext'
import { useFilters } from '../context/FilterContext'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import { useDataOverride } from '../context/DataOverrideContext'
import { useAllSteden } from '../context/CustomStedenContext'
import type { Gebied, LocatieKlasse, GebiedStatus } from '../data/types'
import BronTooltip from '../components/BronTooltip'
import InlineEdit from '../components/InlineEdit'
import EditableText from '../components/EditableText'

const BRONNEN = {
  vvo:      'Vastgoeddata.nl. (2026, 29 april). Gebiedsanalyses kantoormarkten [Dataset]. Vastgoeddata.nl.',
  huurprijs:'Vastgoeddata.nl. (2026, 29 april). Gebiedsanalyses kantoormarkten [Dataset]. Vastgoeddata.nl.',
}

const MARKT_STATUS_CFG: Record<GebiedStatus, { label: string; bg: string; text: string }> = {
  'under-construction': { label: 'Under construction', bg: '#fef3c7', text: '#92400e' },
  'in-progress':        { label: 'In progress',        bg: '#dbeafe', text: '#1d4ed8' },
  'live':               { label: 'Live',               bg: '#d1fae5', text: '#065f46' },
}

// helpers

function klasseVanGebied(gebied: Gebied): LocatieKlasse {
  const klassen = gebied.partijen
    .map((p) => p.locatieKlasse)
    .filter((k): k is NonNullable<LocatieKlasse> => k !== null)
  if (!klassen.length) return null
  const tally = klassen.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as NonNullable<LocatieKlasse>
}

function formatVVO(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(1)} M m²`
  if (m2 >= 1000)      return `${Math.round(m2 / 1000)} k m²`
  return `${m2} m²`
}

// style maps

const KLASSE_STYLE: Record<NonNullable<LocatieKlasse>, { bg: string; text: string; border: string; dot: string }> = {
  A: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', dot: '#059669' },
  B: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#d97706' },
  C: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', dot: '#dc2626' },
}

const TREND_ICON = { positief: '↑', neutraal: '→', negatief: '↓' } as const
const TREND_COLOR = { positief: '#059669', neutraal: '#d97706', negatief: '#dc2626' } as const

function pandJaar(s: string): number {
  const m = s.match(/\d{4}/)
  return m ? parseInt(m[0]) : 9999
}


// GebiedCard

function GebiedCard({ gebied }: { gebied: Gebied }) {
  const { setGebied } = useNavigation()
  const { getStatus } = useGebiedStatus()
  const { getMarktdata, setField } = useDataOverride()
  const klasse = klasseVanGebied(gebied)
  const ks = klasse ? KLASSE_STYLE[klasse] : null
  const { pandenInOntwikkeling, trends, warmeContacten } = gebied
  const marktdata = getMarktdata(gebied.id, gebied.marktdata)
  const mainTrend = trends[0] ?? null
  const activePanden = pandenInOntwikkeling.filter(p => pandJaar(p.verwachteOplevering) >= 2025)
  const [showPanden, setShowPanden] = useState(false)
  const effectiveStatus = getStatus(gebied.id, gebied.status ?? 'live')

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.borderColor = 'var(--c-coral)'
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,127,80,0.15)'
    e.currentTarget.style.transform = 'translateY(-1px)'
  }
  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.borderColor = 'var(--c-border)'
    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group text-left flex flex-col gap-3 rounded-xl p-5 transition-all"
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <EditableText
            tag="h3"
            storageKey={`gebied.${gebied.id}.naam`}
            defaultValue={gebied.naam}
            className="font-semibold text-sm leading-tight"
            style={{ color: 'var(--c-text)' }}
          />
          {effectiveStatus !== 'live' && (
            <span
              className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1"
              style={{
                background: MARKT_STATUS_CFG[effectiveStatus].bg,
                color: MARKT_STATUS_CFG[effectiveStatus].text,
              }}
            >
              {MARKT_STATUS_CFG[effectiveStatus].label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {mainTrend && (
            <span style={{ color: TREND_COLOR[mainTrend.richting], fontSize: 13, fontWeight: 700 }}>
              {TREND_ICON[mainTrend.richting]}
            </span>
          )}
          {ks ? (
            <span
              className="text-xs font-bold rounded"
              style={{ background: ks.bg, color: ks.text, border: `1px solid ${ks.border}`, padding: '2px 7px' }}
            >
              {klasse}
            </span>
          ) : (
            <span
              className="text-xs rounded"
              style={{ background: '#f3f3f3', color: '#bbb', padding: '2px 7px' }}
            >
              -
            </span>
          )}
        </div>
      </div>

      {/* Marktdata grid - verborgen als geen data */}
      {(marktdata.totaalKantoorVvo > 0 || marktdata.huurprijsBandwidth.min > 0 || marktdata.huurprijsBandwidth.max > 0) && (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#f8f7f5' }}>
          <div
            className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 flex items-center"
            style={{ color: 'var(--c-subtle)' }}
          >
            <EditableText storageKey={`gebied.${gebied.id}.label.vvo`} defaultValue="Kantoor VVO" />
            <BronTooltip bron={BRONNEN.vvo} />
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
            <InlineEdit
              value={marktdata.totaalKantoorVvo}
              format={formatVVO}
              onSave={(v) => setField(gebied.id, 'totaalKantoorVvo', v)}
              inputWidth="8ch"
            />
          </div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#eff6ff' }}>
          <div
            className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 flex items-center"
            style={{ color: '#3b82f6' }}
          >
            <EditableText storageKey={`gebied.${gebied.id}.label.huurprijs`} defaultValue="Gem. huurprijs/m²/jr" />
            <BronTooltip bron={BRONNEN.huurprijs} />
          </div>
          <div className="text-sm font-semibold" style={{ color: '#1d4ed8' }}>
            {marktdata.huurprijsGemiddeld != null ? (
              <>€<InlineEdit
                value={marktdata.huurprijsGemiddeld}
                format={(n) => `${n}`}
                onSave={(v) => setField(gebied.id, 'huurprijsGemiddeld', v)}
                inputWidth="4ch"
              /></>
            ) : (
              <>€<InlineEdit
                value={marktdata.huurprijsBandwidth.min}
                format={(n) => `${n}`}
                onSave={(v) => setField(gebied.id, 'huurprijsMin', v)}
                inputWidth="4ch"
              />–<InlineEdit
                value={marktdata.huurprijsBandwidth.max}
                format={(n) => `${n}`}
                onSave={(v) => setField(gebied.id, 'huurprijsMax', v)}
                inputWidth="4ch"
              /></>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Panden in ontwikkeling */}
      {activePanden.length > 0 && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowPanden(v => !v) }}
            className="w-full flex items-center gap-1.5 rounded-lg px-3 py-2 text-left"
            style={{ background: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer' }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--c-coral)',
                animation: 'pulse-dot 2s ease-in-out infinite',
                display: 'inline-block', flexShrink: 0,
              }}
            />
            <span className="text-xs font-medium" style={{ color: '#c2410c' }}>
              {activePanden.length} kantoorpand{activePanden.length !== 1 ? 'en' : ''} in ontwikkeling
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#c2410c', transition: 'transform 0.15s', transform: showPanden ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>
          {showPanden && (
            <div
              className="absolute z-50 rounded-lg shadow-lg"
              style={{
                bottom: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--c-border)',
                padding: '10px 12px',
              }}
            >
              {activePanden.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    fontSize: 11,
                    paddingBottom: i < activePanden.length - 1 ? 8 : 0,
                    marginBottom: i < activePanden.length - 1 ? 8 : 0,
                    borderBottom: i < activePanden.length - 1 ? '1px solid #f0ede8' : 'none',
                  }}
                >
                  <EditableText
                    storageKey={`pand.${p.id}.naam`}
                    defaultValue={p.naam || p.adres}
                    style={{ fontWeight: 600, color: 'var(--c-text)', display: 'block' }}
                  />
                  <div style={{ color: 'var(--c-subtle)', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <EditableText storageKey={`pand.${p.id}.opp`} defaultValue={`${p.oppervlakte.toLocaleString('nl-NL')} m²`} />
                    <span>·</span>
                    <EditableText storageKey={`pand.${p.id}.fase`} defaultValue={p.fase} />
                    <span>·</span>
                    <EditableText storageKey={`pand.${p.id}.oplevering`} defaultValue={p.verwachteOplevering} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card footer */}
      <div
        className="pt-3 flex items-center justify-between gap-2"
        style={{ borderTop: '1px solid var(--c-border)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {warmeContacten.length > 0 && (
            <span
              className="flex items-center gap-1"
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#d97706',
                  display: 'inline-block',
                }}
              />
              <EditableText
                storageKey={`gebied.${gebied.id}.badge.warm`}
                defaultValue={`${warmeContacten.length} warm`}
              />
            </span>
          )}
          <EditableText
            storageKey={`gebied.${gebied.id}.badge.partijen`}
            defaultValue={`${gebied.partijen.length} partijen`}
            className="text-xs"
            style={{ color: 'var(--c-subtle)' }}
          />
        </div>
        <button
          onClick={() => setGebied(gebied)}
          className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--c-coral)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Bekijk gebied →
        </button>
      </div>
    </div>
  )
}

// MarktDashboard

export default function MarktDashboard() {
  const { allSteden: steden } = useAllSteden()
  const { geselecteerdeStad, setStad } = useNavigation()
  const { filters } = useFilters()

  const huidigStad = geselecteerdeStad ?? steden[0]

  const gefilterdeGebieden = huidigStad.gebieden.filter((g) => {
    if (filters.alleenMetOntwikkeling && g.pandenInOntwikkeling.length === 0) return false
    if (filters.klassen.size > 0) {
      const k = klasseVanGebied(g)
      if (!k || !filters.klassen.has(k)) return false
    }
    return true
  })

  const totaalVVO = huidigStad.gebieden.reduce((s, g) => s + g.marktdata.totaalKantoorVvo, 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Stad selector */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--c-subtle)' }}
          >
            Stad
          </div>
          <div className="flex gap-1.5">
            {steden.map((stad) => {
              const active = stad.id === huidigStad.id
              return (
                <button
                  key={stad.id}
                  onClick={() => setStad(stad)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? 'var(--c-coral)' : 'var(--c-surface)',
                    color: active ? '#fff' : 'var(--c-muted)',
                    border: `1px solid ${active ? 'var(--c-coral)' : 'var(--c-border)'}`,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px rgba(255,127,80,0.3)' : 'none',
                  }}
                >
                  {stad.naam}
                </button>
              )
            })}
          </div>
        </div>

        {/* Aggregate stats */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-subtle)' }}>
              <EditableText key={`stats.${huidigStad.id}.totaalvvo.label`} storageKey={`stats.${huidigStad.id}.totaalvvo.label`} defaultValue="Totaal VVO" />
            </div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--c-text)' }}>
              <EditableText key={`stats.${huidigStad.id}.totaalvvo.value`} storageKey={`stats.${huidigStad.id}.totaalvvo.value`} defaultValue={formatVVO(totaalVVO)} />
            </div>
          </div>
        </div>
      </div>

      {/* Kaart section header */}
      <div className="flex items-baseline justify-between">
        <div>
          <EditableText
            key={`header.${huidigStad.id}.titel`}
            tag="h1"
            storageKey={`header.${huidigStad.id}.titel`}
            defaultValue={`${huidigStad.naam} Gebiedskaart`}
            className="text-xl font-semibold"
            style={{ color: 'var(--c-text)', letterSpacing: '-0.01em' }}
          />
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-muted)' }}>
            {gefilterdeGebieden.length} van {huidigStad.gebieden.length} gebieden
            {(filters.klassen.size > 0 || filters.alleenMetOntwikkeling) && ' · gefilterd'}
          </p>
        </div>
      </div>

      {/* Kaart */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundImage: 'radial-gradient(circle, #ccc9c2 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          backgroundColor: '#eae8e3',
          border: '1px solid #dbd9d4',
          minHeight: 360,
        }}
      >
        {gefilterdeGebieden.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
            <p className="text-sm" style={{ color: 'var(--c-subtle)' }}>
              Geen gebieden gevonden met de huidige filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {gefilterdeGebieden.map((g) => (
              <GebiedCard key={g.id} gebied={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
