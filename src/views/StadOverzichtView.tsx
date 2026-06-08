import { useState, useEffect } from 'react'
import { Compass, Users, Target, Handshake } from 'lucide-react'
import { useAllSteden } from '../context/CustomStedenContext'
import type { Stad, Gebied, GebiedStatus, WarmContact, KansrijkeLead } from '../data/types'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import BronTooltip from '../components/BronTooltip'
import EditableText, { queueChange, STORAGE_PREFIX, getEditableText } from '../components/EditableText'
import { useEditMode } from '../context/EditContext'
import { useViewMode } from '../context/ViewModeContext'
import NieuwsFeed from '../components/NieuwsFeed'
import { getImportedItems, deleteImportedItem, type ImportedItem } from '../components/DocumentDropzone'
import { supabase } from '../lib/supabase'

const BRONNEN = {
  jll:      'Jones Lang LaSalle IP, Inc. (2026). Office market: Rotterdam & Eindhoven Q4 2025. JLL Research.',
  vvo:      'Vastgoeddata.nl. (2026, 29 april). Gebiedsanalyses kantoormarkten [Dataset]. Vastgoeddata.nl.',
  leegstand:'Vastgoeddata.nl. (2026, 29 april). Gebiedsanalyses kantoormarkten [Dataset]. Vastgoeddata.nl. Leegstand berekend als: beschikbaar aanbod / totaal VVO per gebied.',
  huurprijs:'Vastgoeddata.nl. (2026, 29 april). Transactiedatabase kantoormarkt 2024–2026 [Dataset]. Vastgoeddata.nl.',
  opname:   'Vastgoeddata.nl. (2026). Transactiemonitor kantoormarkt 2025 [Dataset]. Vastgoeddata.nl.',
  aanbod:   'Vastgoeddata.nl. (2026, 29 april). Gebiedsanalyses kantoormarkten [Dataset]. Vastgoeddata.nl.',
  niy:      'Jones Lang LaSalle IP, Inc. (2026). Office market: Rotterdam & Eindhoven Q4 2025. JLL Research.',
  kvk_hal2: 'HAL 2 B.V. (2024). Jaarrekening 2024. Gedeponeerd bij de Kamer van Koophandel.',
  kvk_desque: 'Desque Eindhoven B.V. (2024). Jaarrekening 2024. Gedeponeerd bij de Kamer van Koophandel.',
  transacties: 'Vastgoeddata.nl. (2026). Transactiedatabase vastgoed 2024–2026 [Dataset]. Vastgoeddata.nl.',
  vvoStad:    'Vastgoeddata.nl. (2026, 20 februari). Gebiedsanalyse Eindhoven / Rotterdam [Dataset]. Vastgoeddata.nl.',
}

// ── Totaal kantoor VVO per stad (stadsniveau, bron: EIND.pdf / Rdam.pdf) ──────
const STAD_KANTOOR_VVO: Record<string, number> = {
  eindhoven: 1_900_681,  // EIND.pdf p.3,  20 februari 2026
  rotterdam: 3_829_464,  // Rdam.pdf p.3,  20 februari 2026
}

// ── JLL Office,  hardcoded source data ───────────────────────────────────────

const JLL_KWARTALEN = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'] as const
type JllKwartaal = typeof JLL_KWARTALEN[number]

interface JllData {
  takeUp:          number  // m²
  vacancyRate:     number  // %
  primeRent:       number  // €/m²/jr
  investmentVolume: number // M€
  primeNIY:        number  // %
  pipeline2030:    number  // m²
  takeUpLabel:     string
  investSub:       string
  bron:            string
}

const BLANK_JLL: JllData = { takeUp: 0, vacancyRate: 0, primeRent: 0, investmentVolume: 0, primeNIY: 0, pipeline2030: 0, takeUpLabel: 'Take-up', investSub: '', bron: '' }

const JLL: Record<string, Record<JllKwartaal, JllData>> = {
  eindhoven: {
    'Q4 2025': {
      takeUp: 25_300, vacancyRate: 6.7, primeRent: 265, investmentVolume: 66.1,
      primeNIY: 6.00, pipeline2030: 175_400,
      takeUpLabel: 'Take-up 2025', investSub: '2025 totaal',
      bron: 'JLL. (2026). Eindhoven Office Market Update Q4 2025. Jones Lang LaSalle IP, Inc.',
    },
    'Q1 2026': {
      takeUp: 3_300, vacancyRate: 6.8, primeRent: 265, investmentVolume: 39.3,
      primeNIY: 6.00, pipeline2030: 175_400,
      takeUpLabel: 'Take-up YTD', investSub: 'YTD 2026',
      bron: 'JLL. (2026). Eindhoven Office Market Update Q1 2026. Jones Lang LaSalle IP, Inc.',
    },
    'Q2 2026': BLANK_JLL, 'Q3 2026': BLANK_JLL, 'Q4 2026': BLANK_JLL,
    'Q1 2027': BLANK_JLL, 'Q2 2027': BLANK_JLL, 'Q3 2027': BLANK_JLL, 'Q4 2027': BLANK_JLL,
  },
  rotterdam: {
    'Q4 2025': {
      takeUp: 54_500, vacancyRate: 6.1, primeRent: 360, investmentVolume: 276,
      primeNIY: 5.50, pipeline2030: 190_200,
      takeUpLabel: 'Take-up 2025', investSub: '2025 totaal',
      bron: 'JLL. (2026). Rotterdam Office Market Update Q4 2025. Jones Lang LaSalle IP, Inc.',
    },
    'Q1 2026': {
      takeUp: 13_000, vacancyRate: 5.8, primeRent: 360, investmentVolume: 25.9,
      primeNIY: 5.50, pipeline2030: 190_200,
      takeUpLabel: 'Take-up YTD', investSub: 'YTD 2026',
      bron: 'JLL. (2026). Rotterdam Office Market Update Q1 2026. Jones Lang LaSalle IP, Inc.',
    },
    'Q2 2026': BLANK_JLL, 'Q3 2026': BLANK_JLL, 'Q4 2026': BLANK_JLL,
    'Q1 2027': BLANK_JLL, 'Q2 2027': BLANK_JLL, 'Q3 2027': BLANK_JLL, 'Q4 2027': BLANK_JLL,
  },
}

function fmJll(n: number, format: (v: number) => string): string {
  return n > 0 ? format(n) : ', '
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmM2(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M m²`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k m²`
  return `${n} m²`
}


// ── Status badge config (ook gebruikt in VastgoedMixChart) ────────────────────

const GEBIED_STATUS_CONFIG: Record<GebiedStatus, { label: string; dot: string; bg: string; text: string }> = {
  'under-construction': { label: 'Under construction', dot: '○', bg: '#fef3c7', text: '#92400e' },
  'in-progress':        { label: 'In progress',        dot: '◑', bg: '#dbeafe', text: '#1d4ed8' },
  'live':               { label: 'Live',               dot: '●', bg: '#d1fae5', text: '#065f46' },
}

// ── VastgoedMix chart ─────────────────────────────────────────────────────────

const MIX: Record<string, { color: string; label: string }> = {
  kantoor: { color: '#ff7f50', label: 'Kantoor' },
  retail:  { color: '#5bb8c4', label: 'Retail'  },
  wonen:   { color: '#8fc4a0', label: 'Wonen'   },
  overig:  { color: '#c8b8a5', label: 'Overig'  },
}

function VastgoedMixChart({ gebieden }: { gebieden: Gebied[] }) {
  const { getStatus } = useGebiedStatus()

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gebieden.map((g) => {
          const effectiveStatus = getStatus(g.id, g.status ?? 'live')
          const statusCfg = effectiveStatus !== 'live' ? GEBIED_STATUS_CONFIG[effectiveStatus] : null
          return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 130, maxWidth: 130, display: 'flex', alignItems: 'center', gap: 4 }}>
                {statusCfg && (
                  <span title={statusCfg.label} style={{ fontSize: 10, color: statusCfg.text, flexShrink: 0 }}>
                    {statusCfg.dot}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.naam}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ff7f50', minWidth: 26, textAlign: 'right', flexShrink: 0 }}>
                  {g.vastgoedMix.kantoor}%
                </span>
                <div style={{ flex: 1, display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', background: '#f0ede8' }}>
                  {Object.keys(MIX).map((key) => {
                    const pct = g.vastgoedMix[key as keyof typeof g.vastgoedMix]
                    if (!pct) return null
                    return (
                      <div key={key} title={`${MIX[key].label}: ${pct}%`} style={{ width: `${pct}%`, background: MIX[key].color }} />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 14 }}>
        {Object.entries(MIX).map(([key, { color, label }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── StadPanel ─────────────────────────────────────────────────────────────────

function KpiItem({
  label,
  value,
  sub,
  isFirst,
  bron,
  storageKey,
}: {
  label: string
  value: string
  sub?: string
  isFirst: boolean
  bron?: string
  storageKey: string
}) {
  return (
    <div
      style={{
        padding: '10px 14px 10px 0',
        borderLeft: !isFirst ? '1px solid var(--c-border)' : 'none',
        paddingLeft: !isFirst ? 14 : 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--c-subtle)',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'flex-start',
          minHeight: 28,
        }}
      >
        <EditableText storageKey={`${storageKey}.label`} defaultValue={label} />
        {bron && <BronTooltip bron={bron} />}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--c-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
        }}
      >
        <EditableText storageKey={`${storageKey}.value`} defaultValue={value} />
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 3 }}>
          <EditableText storageKey={`${storageKey}.sub`} defaultValue={sub} />
        </div>
      )}
    </div>
  )
}

function StadPanel({ stad, onDelete }: { stad: Stad; onDelete?: () => void }) {
  const [kwartaal, setKwartaal] = useState<JllKwartaal>('Q4 2025')
  const jllAll = JLL[stad.id]
  const jll = jllAll?.[kwartaal] ?? BLANK_JLL
  const { getStatus } = useGebiedStatus()
  const { isEditMode } = useEditMode()

  function cycleKwartaal(dir: 1 | -1) {
    setKwartaal((prev) => {
      const idx = JLL_KWARTALEN.indexOf(prev)
      return JLL_KWARTALEN[(idx + dir + JLL_KWARTALEN.length) % JLL_KWARTALEN.length]
    })
  }
  const allUnderConstruction = stad.gebieden.every(
    (g) => getStatus(g.id, g.status ?? 'live') !== 'live'
  )

  // ── Aggregate marktdata ────
  const totaalVVO         = stad.gebieden.reduce((s, g) => s + g.marktdata.totaalKantoorVvo, 0)
  const opname            = stad.gebieden.reduce((s, g) => s + g.marktdata.opnameVorigeJaar, 0)
  const aantalOntwikkeling = stad.gebieden.reduce((s, g) =>
    s + g.pandenInOntwikkeling.filter(p => !/afgerond|opgeleverd|in gebruik/i.test(p.verwachteOplevering)).length, 0)


  return (
    <div
      style={{
        flex: 1,
        minWidth: 380,
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* ── Under-construction overlay ── */}
      {allUnderConstruction && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(251,191,36,0.07) 12px, rgba(251,191,36,0.07) 24px)',
            pointerEvents: 'none',
            zIndex: 1,
            borderRadius: 16,
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Panel header ── */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--c-border)',
            background: allUnderConstruction ? '#fffdf5' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--c-text)',
                  letterSpacing: '-0.03em',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {stad.naam}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--c-subtle)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  JLL Office · {kwartaal}
                </div>
                <button
                  onClick={() => cycleKwartaal(-1)}
                  style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: '#94a3b8', lineHeight: 1 }}
                >‹</button>
                <button
                  onClick={() => cycleKwartaal(1)}
                  style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: '#94a3b8', lineHeight: 1 }}
                >›</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {allUnderConstruction && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: 20,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" stroke="#d97706" strokeWidth="1.3" fill="rgba(217,119,6,0.12)" strokeLinejoin="round" />
                    <line x1="6.5" y1="5.5" x2="6.5" y2="8.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="6.5" cy="10" r="0.7" fill="#d97706" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                    Data in opbouw
                  </span>
                </div>
              )}
              {onDelete && isEditMode && (
                <button
                  onClick={() => { if (window.confirm(`Stad "${stad.naam}" definitief verwijderen?`)) onDelete() }}
                  title="Stad verwijderen"
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'none', border: '1px solid #e2e8f0',
                    color: '#9ca3af', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── JLL KPI strip ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            padding: '14px 24px',
            borderBottom: '1px solid var(--c-border)',
            background: '#faf9f7',
          }}
        >
          {jll && (
            <>
              <KpiItem key={`kpi.${stad.id}.${kwartaal}.takeup`} isFirst storageKey={`kpi.${stad.id}.${kwartaal}.takeup`} label={jll.takeUpLabel} value={fmJll(jll.takeUp, (v) => `${(v / 1000).toFixed(1)}k m²`)} sub={`JLL ${kwartaal}`} bron={jll.bron} />
              <KpiItem key={`kpi.${stad.id}.${kwartaal}.vacancy`} isFirst={false} storageKey={`kpi.${stad.id}.${kwartaal}.vacancy`} label="Vacancy rate" value={fmJll(jll.vacancyRate, (v) => `${v}%`)} sub={`JLL ${kwartaal}`} bron={jll.bron} />
              <KpiItem key={`kpi.${stad.id}.${kwartaal}.primerent`} isFirst={false} storageKey={`kpi.${stad.id}.${kwartaal}.primerent`} label="Prime rent" value={fmJll(jll.primeRent, (v) => `€${v}/m²`)} sub="per jaar" bron={jll.bron} />
              <KpiItem key={`kpi.${stad.id}.${kwartaal}.investvol`} isFirst={false} storageKey={`kpi.${stad.id}.${kwartaal}.investvol`} label="Investment vol." value={fmJll(jll.investmentVolume, (v) => `€${v}M`)} sub={jll.investSub} bron={jll.bron} />
            </>
          )}
        </div>

        {/* ── Body: left indicators + right chart ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

          {/* Left column */}
          <div
            style={{
              padding: '20px 20px 20px 24px',
              borderRight: '1px solid var(--c-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Marktindicatoren */}
            <div>
              <div style={sectionLabelStyle}>Marktindicatoren</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {[
                  { label: 'Totaal kantoor VVO',       value: fmM2(STAD_KANTOOR_VVO[stad.id] ?? totaalVVO), bron: BRONNEN.vvoStad },
                  { label: `Vacancy rate (JLL ${kwartaal})`, value: jll?.vacancyRate ? `${jll.vacancyRate}%` : ', ', bron: jll?.bron ?? BRONNEN.jll },
                  { label: 'Opname 2025 (gebieden)',    value: fmM2(opname),                      bron: BRONNEN.opname },
                  { label: `Take-up (JLL ${kwartaal})`, value: jll?.takeUp ? fmM2(jll.takeUp) : ', ', bron: jll?.bron ?? BRONNEN.jll },
                  { label: 'Pijplijn 2026–2030 (JLL)', value: jll?.pipeline2030 ? fmM2(jll.pipeline2030) : ', ', bron: BRONNEN.jll },
                  { label: 'Panden in ontwikkeling',   value: `${aantalOntwikkeling}`,           bron: BRONNEN.vvo },
                ].map(({ label, value, bron }) => (
                  <div
                    key={label}
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', gap: 8 }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--c-muted)', display: 'flex', alignItems: 'center' }}>
                      <EditableText storageKey={`ind.${stad.id}.${label}.label`} defaultValue={label} />
                      {bron && <BronTooltip bron={bron} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <EditableText storageKey={`ind.${stad.id}.${label}.value`} defaultValue={value} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right column,  vastgoedmix chart */}
          <div style={{ padding: '20px 24px 20px 20px' }}>
            <div style={sectionLabelStyle}>Vastgoedmix per gebied</div>
            <div style={{ marginTop: 14 }}>
              <VastgoedMixChart gebieden={stad.gebieden} />
            </div>

            {/* Prime NIY context */}
            {jll && (
              <div
                style={{
                  marginTop: 20,
                  padding: '12px 14px',
                  background: '#f8f7f5',
                  borderRadius: 10,
                  border: '1px solid var(--c-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'flex', alignItems: 'center' }}>
                    Prime NIY (JLL Q4 2025)
                    <BronTooltip bron={BRONNEN.niy} />
                  </span>
                  <EditableText storageKey={`niy.${stad.id}.value`} defaultValue={`${jll.primeNIY.toFixed(2)}%`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>Concessies (JLL)</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: '#f1f5f9',
                      color: '#475569',
                    }}
                  >
                    <EditableText storageKey={`niy.${stad.id}.concessies`} defaultValue="Stabiel" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--c-subtle)',
}

// ── TestvalidatiePanel ────────────────────────────────────────────────────────

type ValidatieStatus = 'bevestigd' | 'deels' | 'ontbreekt'

interface ValidatiePunt {
  label: string
  toelichting: string
  status: ValidatieStatus
  bron: string
}

const VALIDATIE_DATA: ValidatiePunt[] = [
  {
    label: 'Locatieklasse-indeling (A/B/C)',
    toelichting: 'Indeling herkend en werkbaar bevonden. Michiel illustreerde dit met het rekenvoorbeeld huurprijs/fit-out ratio: een fit-out van €1.000/m² is niet logisch bij €150/m²/jr huur over 5 jaar.',
    status: 'bevestigd',
    bron: 'Michiel Bijmolt,  testmoment 24 april 2026',
  },
  {
    label: 'Warme ingangen uit CRM',
    toelichting: 'Overzicht van bekende contacten (Edge Eindhoven, The Pulse, HERE Technologies, Aroundtown, NSI) herkend als bruikbaar vertrekpunt. Sluit aan op hoe het BD-team in de praktijk werkt.',
    status: 'bevestigd',
    bron: 'Mattijs Kaak,  testmoment 17 april 2026',
  },
  {
    label: 'Differentiatie per dienstvorm (Fast Fit-Out / Smart Moves / D&B)',
    toelichting: 'Duidelijk en groot verschil bevestigd. Fast Fit-Out = snelheid; Smart Moves = technologie en data; Design & Build = meest uitgebreide propositie met beide elementen.',
    status: 'bevestigd',
    bron: 'Michiel Bijmolt,  testmoment 24 april 2026',
  },
  {
    label: 'Eerste contact altijd telefonisch',
    toelichting: 'Bevestigd: koude e-mail werkt te afstandelijk. Bellen geeft directe mogelijkheid om het gesprek te sturen op totale ontzorging. Bij geen reactie: twee dagen later opnieuw bellen.',
    status: 'bevestigd',
    bron: 'Michiel Bijmolt,  testmoment 24 april 2026',
  },
  {
    label: 'Marktcap-berekening per stad',
    toelichting: 'Redenering herkend en werkbaar als indicatie. Verzocht om Amsterdam en Utrecht toe te voegen zodat nieuwe doelsteden naast bestaande markten kunnen worden afgezet.',
    status: 'deels',
    bron: 'Mattijs Kaak,  testmoment 17 april 2026',
  },
  {
    label: 'Gespreksopbouw per type partij',
    toelichting: 'Indeling herkend maar uitwerking op gespreksinhoudniveau te globaal. Bij advocatenkantoren: andere taal, kleding en nadruk. Bij gebouweigenaren: verhuurbaarheid centraal, niet fit-out investering.',
    status: 'deels',
    bron: 'Michiel Bijmolt,  testmoment 24 april 2026',
  },
  {
    label: 'Smart Moves als ingang voor gebouweigenaren',
    toelichting: 'Instaplogica Smart Moves richting gebouweigenaren (leegstandsanalyse als trigger) ontbrak in het prototype. Verbetersuggestie: proactief benaderen op basis van leegstandscijfers per stad.',
    status: 'ontbreekt',
    bron: 'Michiel Bijmolt,  testmoment 24 april 2026',
  },
  {
    label: 'Tab relevante spelers en panden per doelstad',
    toelichting: 'Direct gemis: zonder inzicht in welke partijen en panden relevant zijn, is de marktcap-berekening op zichzelf onvoldoende om een BD zonder voorkennis direct aan de slag te laten gaan.',
    status: 'ontbreekt',
    bron: 'Mattijs Kaak,  testmoment 17 april 2026',
  },
]

const VALIDATIE_STYLE: Record<ValidatieStatus, { bg: string; text: string; border: string; icon: string; label: string }> = {
  bevestigd: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', icon: '✓', label: 'Bevestigd' },
  deels:     { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', icon: '~', label: 'Deels' },
  ontbreekt: { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3', icon: '×', label: 'Ontbreekt' },
}

function TestvalidatiePanel() {
  const [open, setOpen] = useState(false)

  const counts = {
    bevestigd: VALIDATIE_DATA.filter((v) => v.status === 'bevestigd').length,
    deels:     VALIDATIE_DATA.filter((v) => v.status === 'deels').length,
    ontbreekt: VALIDATIE_DATA.filter((v) => v.status === 'ontbreekt').length,
  }

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header,  altijd zichtbaar */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: '#faf9f7',
          border: 'none',
          cursor: 'pointer',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--c-subtle)',
              }}
            >
              Testvalidatie prototype
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
              Bijlage 14,  testronde 1 (17 & 24 april 2026) · Mattijs Kaak & Michiel Bijmolt
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(
              [
                ['bevestigd', counts.bevestigd],
                ['deels',     counts.deels],
                ['ontbreekt', counts.ontbreekt],
              ] as [ValidatieStatus, number][]
            ).map(([status, count]) => {
              const s = VALIDATIE_STYLE[status]
              return (
                <span
                  key={status}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: 20,
                    background: s.bg,
                    color: s.text,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {s.icon} {count} {s.label.toLowerCase()}
                </span>
              )
            })}
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--c-subtle)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          ↓
        </span>
      </button>

      {/* Inhoud,  uitklapbaar */}
      {open && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {VALIDATIE_DATA.map((punt) => {
            const s = VALIDATIE_STYLE[punt.status]
            return (
              <div
                key={punt.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  alignItems: 'start',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: s.text,
                    }}
                  >
                    {s.icon} {s.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--c-subtle)', lineHeight: 1.4 }}>{punt.bron}</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 3 }}>
                    {punt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.6 }}>
                    {punt.toelichting}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── OmgevingskenmerkenPanel ───────────────────────────────────────────────────

function BalansRij({ label, value, storageKey, highlight }: { label: string; value: string; storageKey: string; highlight?: 'rood' | 'groen' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--c-border)' }}>
      <EditableText storageKey={`${storageKey}.label`} defaultValue={label} style={{ fontSize: 12, color: 'var(--c-muted)' }} />
      <EditableText storageKey={`${storageKey}.value`} defaultValue={value} style={{
        fontSize: 12, fontWeight: 700,
        color: highlight === 'rood' ? '#dc2626' : highlight === 'groen' ? '#16a34a' : 'var(--c-text)',
      }} />
    </div>
  )
}

function OmgevingskenmerkenPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div>
          <EditableText storageKey="omgeving.titel" defaultValue="Omgevingskenmerken,  Eindhoven" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em', display: 'block' }} onClick={(e) => e.stopPropagation()} />
          <EditableText storageKey="omgeving.subtitel" defaultValue="Concurrentieanalyse · Design & Build activiteit · Strategische context" style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2, display: 'block' }} onClick={(e) => e.stopPropagation()} />
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

            {/* HAL 2 balans */}
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <EditableText storageKey="omgeving.hal2.naam" defaultValue="HAL 2 B.V." style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <EditableText storageKey="omgeving.hal2.meta" defaultValue="Jaarrekening 2024 · Eindhoven" style={{ fontSize: 11, color: 'var(--c-subtle)' }} />
                    <BronTooltip bron={BRONNEN.kvk_hal2} />
                  </div>
                </div>
                <EditableText storageKey="omgeving.hal2.badge" defaultValue="Financieel gezond" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }} />
              </div>
              <BalansRij storageKey="omgeving.hal2.activa" label="Totaal activa" value="€ 2.500.078" />
              <BalansRij storageKey="omgeving.hal2.ev" label="Eigen vermogen" value="€ 1.269.861" highlight="groen" />
              <BalansRij storageKey="omgeving.hal2.winst" label="Niet-verdeelde winst" value="€ 951.957" highlight="groen" />
              <BalansRij storageKey="omgeving.hal2.liquide" label="Liquide middelen" value="€ 1.257.029" />
              <BalansRij storageKey="omgeving.hal2.schulden" label="Kortlopende schulden" value="€ 1.230.217" />
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
                <EditableText storageKey="omgeving.hal2.kop" defaultValue="Wat dit betekent voor Ditt" style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4, display: 'block' }} />
                <EditableText storageKey="omgeving.hal2.context" defaultValue="HAL 2 is financieel sterk met bijna €1,3M eigen vermogen en ruim €950K winst. Ze opereren vanuit een gezonde kaspositie en kunnen concurreren op prijs. Ditt moet zich richten op snelheid, ontzorging en het ASML-netwerk,  niet op prijs." multiline tag="div" style={{ fontSize: 11, color: '#166534', lineHeight: 1.6 }} />
              </div>
            </div>

            {/* Desque balans */}
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <EditableText storageKey="omgeving.desque.naam" defaultValue="Desque Eindhoven B.V." style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <EditableText storageKey="omgeving.desque.meta" defaultValue="Jaarrekening 2024 · Eindhoven" style={{ fontSize: 11, color: 'var(--c-subtle)' }} />
                    <BronTooltip bron={BRONNEN.kvk_desque} />
                  </div>
                </div>
                <EditableText storageKey="omgeving.desque.badge" defaultValue="Continuïteitszorg" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }} />
              </div>
              <BalansRij storageKey="omgeving.desque.activa" label="Totaal activa" value="€ 3.388.629" />
              <BalansRij storageKey="omgeving.desque.ev" label="Eigen vermogen" value="€ 58.605" highlight="rood" />
              <BalansRij storageKey="omgeving.desque.liquide" label="Liquide middelen" value="€ 641.019" />
              <BalansRij storageKey="omgeving.desque.vorderingen" label="Vorderingen" value="€ 2.198.746" />
              <BalansRij storageKey="omgeving.desque.schulden" label="Kortlopende schulden" value="€ 3.261.485" highlight="rood" />
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
                <EditableText storageKey="omgeving.desque.kop" defaultValue="Wat dit betekent voor Ditt" style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 4, display: 'block' }} />
                <EditableText storageKey="omgeving.desque.context" defaultValue="Desque meldt expliciet een negatief eigen vermogen per 31 dec 2024 en continuïteitsonzekerheid. Kortlopende schulden overstijgen vlottende activa. Dit biedt een opening: opdrachtgevers die zekerheid zoeken over oplevering en nakoming zijn een directe kans voor Ditt." multiline tag="div" style={{ fontSize: 11, color: '#991b1b', lineHeight: 1.6 }} />
              </div>
            </div>

            {/* D&B activiteit Eindhoven */}
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <EditableText storageKey="omgeving.db.titel" defaultValue="Design & Build activiteit,  Eindhoven" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, display: 'block' }} />
              <EditableText storageKey="omgeving.db.meta" defaultValue="Bekende opdrachten in de markt · 2023–2025" style={{ fontSize: 11, color: 'var(--c-subtle)', marginBottom: 12, display: 'block' }} />

              {[
                { id: 'sweco', partij: 'Sweco Architecten → HAL 2 B.V.', aantal: '4 opdrachten', context: 'Sweco, dat veel projecten uitvoert voor ASML, heeft HAL 2 vier keer ingeschakeld voor Design & Build. Dit bevestigt HAL 2 als vaste partner in de ASML-keten,  een netwerk dat voor Ditt nog niet ontsloten is.' },
                { id: 'yksi-geva', partij: 'Yksi Ontwerp + De Bever Architecten → Geva Vastgoed', aantal: '2 opdrachten op Strijp-T', context: 'Yksi Ontwerp (interieurarchitect) voerde samen met De Bever Architecten twee opdrachten uit op Strijp-T voor Geva Vastgoed,  een grote eigenaar in de Eindhovense markt. Geva is nog geen warme relatie voor Ditt.' },
                { id: 'yksi-htc', partij: 'Yksi Ontwerp,  Hightech Campus', aantal: '2 opdrachten', context: 'Twee opdrachten op de Hightech Campus bevestigen dat Yksi actief is in het ASML-ecosysteem. De campus is een groeisegment waarbij Ditt tot nu toe niet in beeld is.' },
              ].map((item) => (
                <div key={item.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <EditableText storageKey={`omgeving.db.${item.id}.partij`} defaultValue={item.partij} style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', flex: 1 }} />
                    <EditableText storageKey={`omgeving.db.${item.id}.aantal`} defaultValue={item.aantal} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                  <EditableText storageKey={`omgeving.db.${item.id}.context`} defaultValue={item.context} tag="div" style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }} />
                </div>
              ))}
            </div>

            {/* Gemiddeld projectformaat concurrenten,  Eindhoven */}
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)', gridColumn: '1 / -1' }}>
              <EditableText storageKey="omgeving.concformaat.titel" defaultValue="Gemiddeld projectformaat,  concurrenten Eindhoven" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, display: 'block' }} />
              <EditableText storageKey="omgeving.concformaat.meta" defaultValue="Op basis van gepubliceerde portfoliogegevens · duotone-interior.nl · hal2.nl · ininterieurs.nl" style={{ fontSize: 11, color: 'var(--c-subtle)', marginBottom: 14, display: 'block' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                {[
                  {
                    id: 'duotone',
                    naam: 'Duotone Interior Concepts',
                    bron: 'duotone-interior.nl/projecten',
                    projecten: [
                      { naam: 'Molex BV,  HTC', m2: 1800 },
                      { naam: 'Marvell Technology,  HTC', m2: 1500 },
                      { naam: 'HTC Plantarium', m2: 800 },
                      { naam: 'HTC Building 37 (renovatie)', m2: 550 },
                      { naam: 'Maas Makelaars', m2: 200 },
                    ],
                    gem: 970,
                    context: 'Actief op High Tech Campus voor zowel enterprise (Molex, Marvell) als kleinere ruimtes en gemeenschappelijke zones. Breed portfolio,  van 200 m² tot 1.800 m².',
                  },
                  {
                    id: 'hal2',
                    naam: 'HAL 2 B.V.',
                    bron: 'hal2.nl/projecten',
                    projecten: [
                      { naam: 'VdMeijs', m2: 1000 },
                      { naam: 'Sweco,  Eindhoven', m2: 1000 },
                      { naam: 'Stuurmen', m2: 200 },
                      { naam: 'ALX Studio', m2: 100 },
                      { naam: 'BEECKK Ruimtemakers,  Strijp-S', m2: 100 },
                    ],
                    gem: 480,
                    context: 'Brede doelgroep: van 100 m² creatieve studios op Strijp-S tot 1.000 m² zakelijke dienstverleners. Gemiddeld formaat lager dan Duotone,  minder enterprise, meer MKB.',
                  },
                  {
                    id: 'ininterieurs',
                    naam: 'INinterieurs',
                    bron: 'ininterieurs.nl/projecten',
                    projecten: [],
                    gem: 0,
                    context: 'Schrijf hier je eigen notities over INinterieurs,  projecten, formaat, positionering, contacten.',
                  },
                ].map((c) => (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 8, padding: '12px', border: '1px solid var(--c-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 6 }}>
                      <EditableText storageKey={`omgeving.concformaat.${c.id}.naam`} defaultValue={c.naam} style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }} />
                      {c.gem > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-coral)', background: '#fff7f4', border: '1px solid #ffd4c2', borderRadius: 8, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ø {c.gem.toLocaleString('nl-NL')} m²
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 8 }}>Bron: {c.bron}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                      {c.projecten.map((p) => (
                        <div key={p.naam} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-muted)' }}>
                          <EditableText storageKey={`omgeving.concformaat.${c.id}.p.${p.naam.replace(/\s+/g, '_')}`} defaultValue={p.naam} />
                          {p.m2 > 0 && (
                            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--c-muted)', flexShrink: 0, marginLeft: 6 }}>
                              {p.m2.toLocaleString('nl-NL')} m²
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <EditableText storageKey={`omgeving.concformaat.${c.id}.context`} defaultValue={c.context} tag="div" multiline={c.id === 'ininterieurs'} style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6, minHeight: c.id === 'ininterieurs' ? '6em' : undefined }} />
                  </div>
                ))}
              </div>

              <div style={{ padding: '10px 12px', background: '#fff7f4', borderRadius: 8, border: '1px solid #ffd4c2' }}>
                <EditableText storageKey="omgeving.concformaat.conclusie" defaultValue="Duotone (ø 970 m²) domineert enterprise op HTC. HAL 2 (ø 480 m²) en INinterieurs bedienen MKB op Strijp-S. Ditt kan zich positioneren in het segment 500–1.500 m² op HTC en Strijp-S." tag="div" style={{ fontSize: 11, color: 'var(--c-coral)', lineHeight: 1.6, fontWeight: 600 }} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ── Rotterdam Kantorenstrategie MRDH ──────────────────────────────────────────

function RotterdamKantorenstrategiePanel() {
  const [open, setOpen] = useState(false)

  const kansen = [
    {
      id: 'vervangingsvraag',
      titel: 'Vervangingsvraag: 321.500 m² t/m 2035',
      context: 'De gemeente Rotterdam heeft een vervangingsvraag van 321.500 m² kantoorruimte die kwalitatief moet worden opgewaardeerd. Dit zijn verouderde panden die huurders willen verlaten of die eigenaren moeten renoveren. Dit is direct Ditt\'s markt: D&B renovatietrajecten waarbij ontwerp en realisatie in één hand liggen.',
      kleur: '#f97316',
      bg: '#fff7f4',
      border: '#ffd4c2',
    },
    {
      id: 'flight',
      titel: 'Flight to quality,  verhuismoment = kans',
      context: 'Rotterdam heeft de sterkste huurprijsgroei van alle Europese kantorsteden (+28,3% jaar-op-jaar, Cushman & Wakefield 2025). Bedrijven verhuizen naar betere locaties. Elk verhuismoment is een acquisitie-instappunt voor Ditt,  de huurder heeft dan een directe behoefte aan een integrale D&B partner.',
      kleur: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      id: 'schaarste',
      titel: 'Schaarste op toplocaties,  huurders investeren in huidig pand',
      context: 'Modern kantorenaanbod op OV-knooppuntlocaties (Centrum, Blaak, Rotterdam Alexander) is schaars. Huurders die wél op een toplocatie zitten kunnen niet verhuizen,  ze investeren in hun bestaande ruimte. Dit genereert inrichtingsopdrachten zonder verhuisbeweging.',
      kleur: '#7c3aed',
      bg: '#faf5ff',
      border: '#e9d5ff',
    },
    {
      id: 'duurzaamheid',
      titel: 'Duurzaamheidsrenovatie,  energielabel C verplicht',
      context: 'Sinds 2023 is energielabel C verplicht voor bestaande kantoren. Gebouweigenaren moeten renoveren. Ditt kan hier vroeg betrokken raken als D&B partner: combineer energierenovatie met interieurupgrade en positioneer Ditt als de integrale ontzorger voor gebouweigenaren en hun huurders.',
      kleur: '#16a34a',
      bg: '#f0fdf4',
      border: '#86efac',
    },
    {
      id: 'groeilocaties',
      titel: 'Drie groeilocaties: Centrum, Kop van Zuid, Rotterdam Alexander',
      context: 'De MRDH kantorenstrategie 2025–2035 wijst Rotterdam Centrum (CBD), Kop van Zuid en Rotterdam Alexander aan als de toplocaties met de meeste toekomstpotentie. Dit zijn de OV-knooppuntlocaties waar bedrijven naartoe willen en waar de vervangings- en uitbreidingsvraag zich concentreert. Ditt\'s doelgroep van 500–5.000 m² is hier sterk vertegenwoordigd.',
      kleur: '#0891b2',
      bg: '#f0f9ff',
      border: '#bae6fd',
    },
  ]

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>
            Rotterdam kantorenstrategie 2025–2035,  kansen voor Ditt
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
            MRDH Actualisatie Kantorenstrategie 2025–2035 · Metropoolregio Rotterdam Den Haag
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px' }}>

          {/* Marktcijfers banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Kantoorvoorraad Rotterdam', value: '3,17 mln m²', sub: 'gemeente Rotterdam 2023' },
              { label: 'Leegstand regio', value: '7,4%', sub: 'Rotterdamse regio 2023' },
              { label: 'Uitbreidingsvraag t/m 2035', value: '139.000 m²', sub: 'gemeente Rotterdam' },
              { label: 'Vervangingsvraag t/m 2035', value: '321.500 m²', sub: 'verouderde panden' },
              { label: 'Huurprijsgroei (Europa)', value: '+28,3%', sub: 'sterkste van Europese steden' },
            ].map((item) => (
              <div key={item.label} style={{ background: '#f8f7f5', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.2 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Kansen voor Ditt */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 12 }}>
            Kansen voor Ditt,  Rotterdam
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kansen.map((k) => (
              <div key={k.id} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${k.border}` }}>
                <EditableText
                  storageKey={`rdam.strategie.${k.id}.titel`}
                  defaultValue={k.titel}
                  style={{ fontSize: 12, fontWeight: 700, color: k.kleur, marginBottom: 4, display: 'block' }}
                />
                <EditableText
                  storageKey={`rdam.strategie.${k.id}.tekst`}
                  defaultValue={k.context}
                  tag="div"
                  multiline
                  style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.7 }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 10, color: 'var(--c-subtle)' }}>
            Bron: Metropoolregio Rotterdam Den Haag (2025). Actualisatie Kantorenstrategie MRDH 2025–2035. MRDH.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rotterdam Leegstand per pand ──────────────────────────────────────────────

interface LeegstandVerdieping {
  label: string   // bijv. 'V19' of 'V12 – Toren B/C'
  m2: number | null
  opmerking?: string  // bijv. 'volledig leeg', 'voor de helft'
}

interface LeegstandPand {
  id: string
  naam: string
  adres: string
  eigenaar: string
  totaalLeeg: number      // m² totaal leeg
  totaalPand?: number     // m² totale pandgrootte indien bekend
  verdiepingen: LeegstandVerdieping[]
}

const LEEGSTAND_PANDEN: LeegstandPand[] = [
  {
    id: 'delftse-poort',
    naam: 'Delftse Poort',
    adres: 'Weena 70, Rotterdam',
    eigenaar: 'CBRE Investment Management',
    totaalLeeg: 8210,
    totaalPand: 71916,
    verdiepingen: [
      { label: 'V20 – Toren A', m2: 720 },
      { label: 'V19 – Toren A', m2: 730 },
      { label: 'V19 – Toren B', m2: 800 },
      { label: 'V18 – Toren A', m2: 1400 },
      { label: 'V17 – Toren A', m2: 1400 },
      { label: 'V16 – Toren B', m2: 380 },
      { label: 'V7 – Toren A',  m2: 1390 },
      { label: 'V6 – Toren A',  m2: 1390 },
    ],
  },
  {
    id: 'w200',
    naam: 'W200',
    adres: 'Weena 200, Rotterdam',
    eigenaar: 'Neo-Capital',
    totaalLeeg: 3412,
    verdiepingen: [
      { label: 'V12 – Toren A',   m2: 282 },
      { label: 'V12 – Toren B/C', m2: 1273 },
      { label: 'V6 – Toren A/C',  m2: 929 },
      { label: 'V5 – Toren B',    m2: 464 },
      { label: 'V3 – Toren B',    m2: 464 },
    ],
  },
  {
    id: 'weenatoren',
    naam: 'Weenatoren',
    adres: 'Weena 750, Rotterdam',
    eigenaar: 'Dudok Real Estate',
    totaalLeeg: 952,
    verdiepingen: [
      { label: 'V5', m2: 952 },
    ],
  },
  {
    id: 'first-rotterdam',
    naam: 'First Rotterdam',
    adres: 'Weena 70, Rotterdam',
    eigenaar: 'Bouwinvest',
    totaalLeeg: 210,
    verdiepingen: [
      { label: 'V30', m2: 210 },
    ],
  },
  {
    id: 'the-core',
    naam: 'The Core',
    adres: 'Weena 690, Rotterdam',
    eigenaar: 'E&G Funds / Asset Management',
    totaalLeeg: 1350,
    verdiepingen: [
      { label: 'V6', m2: 1350 },
    ],
  },
]

function RotterdamLeegstandPanel() {
  const [open, setOpen] = useState(false)
  const totaalLeeg = LEEGSTAND_PANDEN.reduce((s, p) => s + p.totaalLeeg, 0)

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
            Beschikbaar aanbod,  leegstand per pand
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
            Rotterdam Centrum · {LEEGSTAND_PANDEN.length} panden · {totaalLeeg.toLocaleString('nl-NL')} m² beschikbaar
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {LEEGSTAND_PANDEN.map((pand) => (
              <div key={pand.id} style={{ background: '#f8f7f5', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--c-border)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <EditableText storageKey={`leegstand.${pand.id}.naam`} defaultValue={pand.naam} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                    <EditableText storageKey={`leegstand.${pand.id}.adres`} defaultValue={pand.adres} style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 1, display: 'block' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', flexShrink: 0, marginLeft: 8 }}>
                    <EditableText storageKey={`leegstand.${pand.id}.totaalLeeg`} defaultValue={`${pand.totaalLeeg.toLocaleString('nl-NL')} m²`} />
                  </span>
                </div>

                {/* Eigenaar */}
                <div style={{ fontSize: 11, color: 'var(--c-muted)', marginBottom: 10 }}>
                  Eigenaar: <EditableText storageKey={`leegstand.${pand.id}.eigenaar`} defaultValue={pand.eigenaar} style={{ fontWeight: 600, color: 'var(--c-text)' }} />
                  {pand.totaalPand && (
                    <span style={{ color: 'var(--c-subtle)', marginLeft: 6 }}>· {pand.totaalPand.toLocaleString('nl-NL')} m² totaal</span>
                  )}
                </div>

                {/* Verdiepingen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {pand.verdiepingen.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '3px 6px', borderRadius: 5, background: 'var(--c-surface)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--c-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        <EditableText storageKey={`leegstand.${pand.id}.v${i}.label`} defaultValue={v.label} />
                      </span>
                      <span style={{ color: 'var(--c-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                        <EditableText storageKey={`leegstand.${pand.id}.v${i}.waarde`} defaultValue={v.m2 ? `${v.m2.toLocaleString('nl-NL')} m²` : (v.opmerking ?? ', ')} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--c-subtle)' }}>
            Bron: Vastgoeddata.nl verhuurmodule Rotterdam Centrum · mei 2026
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rotterdam Omgevingskenmerken ───────────────────────────────────────────────

function RotterdamOmgevingskenmerkenPanel() {
  const [open, setOpen] = useState(false)
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('omgeving.rdam.hiddenCards')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  function hideCard(id: string) {
    setHiddenCards((prev) => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('omgeving.rdam.hiddenCards', JSON.stringify([...next]))
      return next
    })
  }

  function restoreAll() {
    setHiddenCards(new Set())
    localStorage.removeItem('omgeving.rdam.hiddenCards')
  }

  const deleteBtn = (id: string) => (
    <button
      onClick={(e) => { e.stopPropagation(); hideCard(id) }}
      title="Verwijder kaart"
      style={{ marginLeft: 8, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--c-subtle)', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-subtle)')}
    >×</button>
  )

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <EditableText storageKey="omgeving.rdam.titel" defaultValue="Omgevingskenmerken,  Rotterdam" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em', display: 'block' }} onClick={(e) => e.stopPropagation()} />
          <EditableText storageKey="omgeving.rdam.subtitel" defaultValue="Concurrentieanalyse · Design & Build activiteit · Strategische context" style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2, display: 'block' }} onClick={(e) => e.stopPropagation()} />
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px' }}>
          {hiddenCards.size > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{hiddenCards.size} kaart{hiddenCards.size > 1 ? 'en' : ''} verborgen</span>
              <button onClick={restoreAll} style={{ fontSize: 11, color: 'var(--c-coral)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Herstel alles</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

            {/* Sprank */}
            {!hiddenCards.has('sprank') && (
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <EditableText storageKey="omgeving.sprank.naam" defaultValue="Sprank Interieurprojecten" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <EditableText storageKey="omgeving.sprank.meta" defaultValue="sprank.nl · Rotterdam · 20+ jaar actief" style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 1, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditableText storageKey="omgeving.sprank.badge" defaultValue="Sterke lokale speler" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }} />
                  {deleteBtn('sprank')}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 10 }}>Bron: sprank.nl/projecten</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Projecten in Rotterdam (bevestigde m²)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                {[
                  { id: 'sprank-p1', naam: 'VTTI,  The Mark (1e verdieping)', m2: '1.239 m²' },
                  { id: 'sprank-p2', naam: 'Hoge Erasmus,  entree (Ooms Makelaars)', m2: '500 m²' },
                ].map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-muted)' }}>
                    <EditableText storageKey={`omgeving.${p.id}.naam`} defaultValue={p.naam} />
                    <EditableText storageKey={`omgeving.${p.id}.m2`} defaultValue={p.m2} style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde047' }}>
                <EditableText storageKey="omgeving.sprank.context" defaultValue="Sprank is de meest gelijkende concurrent op Ditt in Rotterdam,  lokaal geworteld, D&B focus, brede klantenkring. Ze werken voor makelaars (Ooms) en directe huurders. Concurreren op relatie en snelheid, niet puur op design." tag="div" style={{ fontSize: 11, color: '#854d0e', lineHeight: 1.6 }} />
              </div>
            </div>
            )}

            {/* Plan@Office */}
            {!hiddenCards.has('planatoffice') && (
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <EditableText storageKey="omgeving.planatoffice.naam" defaultValue="Plan@Office" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <EditableText storageKey="omgeving.planatoffice.meta" defaultValue="planatoffice.nl · Dordrecht/Rotterdam · Project­inrichting" style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 1, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditableText storageKey="omgeving.planatoffice.badge" defaultValue="Meubel­gericht" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} />
                  {deleteBtn('planatoffice')}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 10 }}>Bron: planatoffice.nl/projecten</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Projecten in Rotterdam</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                {[
                  { id: 'planatoffice-p1', naam: 'Den Hartogh,  Sluisjesdijk (campus)', m2: '24.000 m²' },
                  { id: 'planatoffice-p2', naam: 'EuroNordic,  Waalhaven', m2: '1.780 m²' },
                  { id: 'planatoffice-p3', naam: '9Corporate,  Weena', m2: '1.000 m²' },
                ].map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-muted)' }}>
                    <EditableText storageKey={`omgeving.${p.id}.naam`} defaultValue={p.naam} />
                    <EditableText storageKey={`omgeving.${p.id}.m2`} defaultValue={p.m2} style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <EditableText storageKey="omgeving.planatoffice.context" defaultValue="Plan@Office is meer een projectinrichter dan een echte D&B-speler,  sterker in meubilair en levering dan in ontwerp en bouw. Minder directe concurrent voor Ditt's kernpropositie, maar wel actief bij eigenaren en huurders in het Waalhaven/Rdam-segment." tag="div" style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }} />
              </div>
            </div>
            )}

            {/* Leidmotiv */}
            {!hiddenCards.has('leidmotiv') && (
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <EditableText storageKey="omgeving.leidmotiv.naam" defaultValue="Leidmotiv" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <EditableText storageKey="omgeving.leidmotiv.meta" defaultValue="leidmotiv.com · Amsterdam · Design & Build" style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 1, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditableText storageKey="omgeving.leidmotiv.badge" defaultValue="Design-gedreven" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' }} />
                  {deleteBtn('leidmotiv')}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 10 }}>Bron: leidmotiv.com/projecten</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)', marginBottom: 6 }}>Projecten in Rotterdam (bevestigd)</div>
                {[
                  { id: 'leidmotiv-p1', naam: 'Rotterdam Partners (2024)', m2: ', ' },
                  { id: 'leidmotiv-p2', naam: 'Pentrade (2023)', m2: ', ' },
                  { id: 'leidmotiv-p3', naam: 'HDI (2022)', m2: '150 m²' },
                  { id: 'leidmotiv-p4', naam: 'Crowe Peak (2021)', m2: '400 m²' },
                  { id: 'leidmotiv-p5', naam: 'Carerix (2018)', m2: '600 m²' },
                ].map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-muted)', padding: '3px 0', borderBottom: '1px solid var(--c-border)' }}>
                    <EditableText storageKey={`omgeving.${p.id}.naam`} defaultValue={p.naam} />
                    <EditableText storageKey={`omgeving.${p.id}.m2`} defaultValue={p.m2} style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <EditableText storageKey="omgeving.leidmotiv.context" defaultValue="Leidmotiv is een design-gedreven D&B-studio met nationale uitstraling en sterke storytelling-aanpak. Actief in Rotterdam (Rotterdam Partners, Pentrade, HDI). Positioneren zich op merk en betekenis,  directe concurrent voor kwalitatieve huurders die design hoog in het vaandel hebben. Kleinere projectomvang dan Ditt's focus, maar groeiend in het kantoorsegment." tag="div" style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }} />
              </div>
            </div>
            )}

            {/* Desque Rotterdam */}
            {!hiddenCards.has('desque-rdam') && (
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <EditableText storageKey="omgeving.rdam.desque.naam" defaultValue="Desque" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                  <EditableText storageKey="omgeving.rdam.desque.meta" defaultValue="desque.nl · Rotterdam (Sint Jobsweg) + Eindhoven · Projectinrichting" style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 1, display: 'block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditableText storageKey="omgeving.rdam.desque.badge" defaultValue="Top-3 NL" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }} />
                  {deleteBtn('desque-rdam')}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 10 }}>Bron: desque.nl/projecten</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Projecten in Rotterdam (bevestigd)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                {[
                  { id: 'desque-rdam-p1', naam: 'Stolt-Nielsen,  Westerlaantoren (2024)', m2: '5.500 m²' },
                  { id: 'desque-rdam-p2', naam: 'Delftse Poort (2021)', m2: ', ' },
                  { id: 'desque-rdam-p3', naam: 'LBC,  Botlek (2022)', m2: ', ' },
                ].map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-muted)', padding: '3px 0', borderBottom: '1px solid var(--c-border)' }}>
                    <EditableText storageKey={`omgeving.${p.id}.naam`} defaultValue={p.naam} />
                    <EditableText storageKey={`omgeving.${p.id}.m2`} defaultValue={p.m2} style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 12px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde047' }}>
                <EditableText storageKey="omgeving.rdam.desque.context" defaultValue="Desque is een landelijke top-3 projectinrichter met eigen vestiging in Rotterdam. Ze zijn sterker als meubel- en inrichtingsspecialist dan als volledig D&B-partij,  ontwerp en bouw wordt uitbesteed aan externe architecten en aannemers. Schaub makelaars werkt al met Desque samen, dus dit netwerk is niet meer vrij te veroveren. Ditt's onderscheid zit in integrale D&B-propositie: één partij voor ontwerp én realisatie." tag="div" style={{ fontSize: 11, color: '#854d0e', lineHeight: 1.6 }} />
              </div>
            </div>
            )}

            {/* Strategische conclusie Rotterdam */}
            {!hiddenCards.has('conclusie') && (
            <div style={{ background: '#fff7f4', borderRadius: 10, padding: '16px', border: '1px solid #ffd4c2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <EditableText storageKey="omgeving.rdam.conclusie.titel" defaultValue="Strategische positie Ditt,  Rotterdam" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-coral)', display: 'block' }} />
                {deleteBtn('conclusie')}
              </div>
              <EditableText storageKey="omgeving.rdam.conclusie.tekst" defaultValue="Rotterdam heeft geen dominante lokale D&B-speler van de omvang van HAL 2 in Eindhoven. Sprank is de meest directe concurrent maar opereert breder dan alleen D&B. Plan@Office en UP zitten in het lagere segment. Dit geeft Ditt ruimte om zich te positioneren als de kwalitatieve D&B-specialist op Kop van Zuid en Brainpark,  een gat dat nog niet gevuld is. Prioriteit: makelaarsrelaties opbouwen (Ooms, Verschuuren & Schreppers) voordat concurrenten die positie innemen." multiline tag="div" style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.7 }} />
            </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ── RecenteTransactiesPanel ───────────────────────────────────────────────────

interface Transactie {
  adres: string
  verkoper: string
  koper: string
  koopsom: string
  datum: string
  context: string
}

interface GebiedTransacties {
  id: string
  naam: string
  stad: 'eindhoven' | 'rotterdam'
  transacties: Transactie[]
}

const TRANSACTIES_DATA: GebiedTransacties[] = [
  {
    id: 'htc-asml',
    naam: 'High Tech Campus',
    stad: 'eindhoven',
    transacties: [
      {
        adres: 'De Run 1101, Veldhoven',
        verkoper: 'Simac Techniek NV',
        koper: 'ASML',
        koopsom: '~€10–12M',
        datum: 'mei 2024',
        context: 'ASML breidt zijn campus verder uit door naastgelegen pand van IT-dienstverlener Simac over te nemen. Signaleert actieve verhuisbewegingen in het ASML-ecosysteem: kantoorruimte die vrijkomt bij leveranciers en partners is een directe ingang voor Ditt.',
      },
    ],
  },
  {
    id: 'eindhoven-centrum',
    naam: 'Centrum Eindhoven',
    stad: 'eindhoven',
    transacties: [
      {
        adres: 'Stationsweg 17, Eindhoven',
        verkoper: 'Edge Technologies',
        koper: 'Bouwinvest',
        koopsom: '~€100–150M',
        datum: 'juni 2024',
        context: 'Grootste kantooroverdracht bij Eindhoven Centraal in jaren. Bouwinvest treedt aan als nieuwe eigenaar van dit multi-huurder complex. Eigendomswissel bij institutionele partij genereert verhuur- en inrichtingsactiviteit bij bestaande en nieuwe huurders.',
      },
      {
        adres: 'De Rungraaf 78, Eindhoven',
        verkoper: 'Achmea Real Estate',
        koper: 'Investe Group',
        koopsom: '~€18–20M',
        datum: 'maart 2025',
        context: 'Na overdracht van Achmea aan Investe Group volgt doorgaans herpositionering en nieuwe verhuur. Nieuwe eigenaar investeert veelal in kwaliteitsverbetering,  een kans voor D&B-acquisitie bij fit-out van instromende huurders.',
      },
      {
        adres: 'Vestdijk 45, Eindhoven',
        verkoper: 'Cantera Beheer',
        koper: 'Van der Valk',
        koopsom: '~€60–70M',
        datum: 'februari 2025',
        context: 'Hotel-acquisitie in het centrum bevestigt actieve investeringsmarkt. Van der Valk investeert in transformatie en herinrichting,  een type project waarbij Ditt inzetbaar is voor interieur Design & Build.',
      },
    ],
  },
  {
    id: 'eindhoven-airport',
    naam: 'Airport / Flight Forum',
    stad: 'eindhoven',
    transacties: [
      {
        adres: 'Park Forum 1119, Eindhoven',
        verkoper: 'Edmond de Rothschild REIM',
        koper: 'The Pictet Group / Stoneweg',
        koopsom: '~€7–8M',
        datum: 'oktober 2025',
        context: 'Internationale institutionele transactie: Frans-Zwitsers consortium neemt object over. Nieuwe eigenaar met internationale huurdersbasis genereert inrichtingsvraag en is open voor kwaliteitspartners.',
      },
      {
        adres: 'Park Forum 1053, Eindhoven',
        verkoper: 'PowerSlim',
        koper: 'GD Medical',
        koopsom: '~€6–7M',
        datum: 'november 2025',
        context: 'Eindgebruiker koopt pand; gebruikerswijziging van lifestyle/voeding naar medtech genereert directe inrichtingsvraag voor specifiek werkplekconcept.',
      },
      {
        adres: 'Luchthavenweg 75, Eindhoven',
        verkoper: 'Bond Concepts',
        koper: 'Breadstone',
        koopsom: '~€9–10M',
        datum: 'februari 2025',
        context: 'Nieuwe eigenaar op strategische locatie dicht bij luchthaven. Breadstone is actief als vastgoedinvesteerder en zal pand verhuurklaar maken,  kans voor Ditt bij cat-A/cat-B inrichting.',
      },
      {
        adres: 'Westfields 1010, Oirschot (Airport-corridor)',
        verkoper: 'Nuveen Real Estate',
        koper: 'SEGRO',
        koopsom: '~€100–150M',
        datum: 'juli 2024',
        context: 'Grote logistieke transactie in Airport-corridor illustreert het sterke institutionele investeringsklimaat rondom Eindhoven Airport. SEGRO is pan-Europees actief en brengt internationale huurders mee.',
      },
    ],
  },
  {
    id: 'rotterdam-centrum',
    naam: 'Rotterdam Centrum',
    stad: 'rotterdam',
    transacties: [
      {
        adres: 'Diergaardesingel 75A, Rotterdam (WTC)',
        verkoper: 'Union Investment',
        koper: 'Bouwinvest',
        koopsom: '~€150–200M',
        datum: 'september 2025',
        context: 'Grootste Rotterdamse kantoorverkoop van 2025. Bouwinvest neemt WTC Rotterdam over van Union Investment. Bij eigendomswisseling van dit formaat verwachten huurders serviceniveauwijzigingen en voeren herinrichtingsgesprekken.',
      },
      {
        adres: 'Blaak 555, Rotterdam',
        verkoper: 'Edge Technologies',
        koper: 'MSC',
        koopsom: '~€70–80M',
        datum: 'juni 2025',
        context: 'Flight-to-quality: internationale scheepvaartgigant MSC neemt topkantoor op A-locatie Blaak. Gebruikersovername van deze omvang gepaard met volledige herinrichting naar eigen bedrijfsidentiteit,  core D&B-propositie.',
      },
      {
        adres: 'Delftsestraat 26, Rotterdam',
        verkoper: 'Achmea',
        koper: 'Dudok Groep',
        koopsom: '~€25–30M',
        datum: 'juni 2024',
        context: 'Dudok Groep is actief in herontwikkeling van kantoorpanden naar gemengd gebruik. Na aankoop volgt doorgaans transformatie waarbij architectonisch Design & Build centraal staat.',
      },
      {
        adres: 'Blaak 20, Rotterdam',
        verkoper: 'Review Real Estate',
        koper: 'Egeria / Flow Real Estate',
        koopsom: '~€20–25M',
        datum: 'februari 2025',
        context: 'Egeria is een duurzame kantoorontwikkelaar; aankoop wordt gevolgd door verbouwing richting BREEAM-/WELL-gecertificeerd pand. Dit type project sluit direct aan op Ditt\'s D&B-propositie met duurzaamheidsfocus.',
      },
      {
        adres: 'Lijnbaan 101, Rotterdam',
        verkoper: 'Dela Vastgoed',
        koper: 'A1 Vastgoed',
        koopsom: '~€18–20M',
        datum: 'januari 2026',
        context: 'Eigendomswisseling in prime winkel-/kantoorgebied; A1 Vastgoed positioneert pand her voor nieuwe huurders. Nieuwe verhuurcampagne genereert inrichtingsvraag.',
      },
      {
        adres: 'Calandstraat 33, Rotterdam',
        verkoper: 'Bouwinvest',
        koper: 'Provast Beheer',
        koopsom: '~€14–16M',
        datum: 'oktober 2025',
        context: 'Provast staat bekend om herontwikkeling van kantoorpanden. Aankoop van Bouwinvest duidt op transformatieproject in voorbereiding,  ideale instap voor Ditt in vroeg stadium.',
      },
    ],
  },
  {
    id: 'rotterdam-alexander',
    naam: 'Rotterdam Alexander',
    stad: 'rotterdam',
    transacties: [
      {
        adres: 'Fascinatio Boulevard 348, Rotterdam',
        verkoper: 'Flemyn / 1Zone Capital',
        koper: 'Corum Investments',
        koopsom: '~€50–60M',
        datum: 'december 2024',
        context: 'Frans REIT Corum koopt het grootste kantoorcomplex in het Alexander-cluster. Multi-huurder object met internationale eigenaar: nieuwe verhuurstrategie brengt nieuwe huurders die ingerichte ruimte zoeken.',
      },
      {
        adres: 'Watermanweg 4, Rotterdam',
        verkoper: 'DWS',
        koper: 'Corum Origin',
        koopsom: '~€14–16M',
        datum: 'oktober 2024',
        context: 'DWS (Deutsche Bank vastgoedtak) verkoopt aan Corum Origin. Nieuwe eigenaar investeert in verhuurbaarheid,  kans om vroeg in gesprek te komen over inrichting van verhuurbare units.',
      },
      {
        adres: 'Rivium Quadrant 81, Capelle a/d IJssel',
        verkoper: 'Harbert / Quan Real Estate',
        koper: 'Schouten Zekerheid',
        koopsom: '~€9–10M',
        datum: 'november 2024',
        context: 'Eindgebruiker koopt eigen kantoorpand. Schouten Zekerheid is verzekeringsadviseur die nu eigenaar wordt van eigen pand,  directe inrichtingsvraag voor eigen werkplek is te verwachten.',
      },
    ],
  },
  {
    id: 'fellenoord',
    naam: 'Centrum Eindhoven,  Fellenoord',
    stad: 'eindhoven',
    transacties: [
      {
        adres: 'Kennedyplein 100, Eindhoven',
        verkoper: 'NSI Vastgoed',
        koper: 'Gemeente Eindhoven',
        koopsom: '~€18–20M',
        datum: 'december 2025',
        context: 'Gemeentelijke opkoop als onderdeel van het Fellenoord transformatieplan. NSI verkoopt; huurders worden verplaatst. Verhuisbeweging van gevestigde kantoorhuurders genereert directe vraag naar nieuw kantoor.',
      },
      {
        adres: 'Kennedyplein 300, Eindhoven',
        verkoper: 'Aberdeen Standard Investments',
        koper: 'Gemeente Eindhoven',
        koopsom: '~€20–25M',
        datum: 'december 2025',
        context: 'Samen met Kennedyplein 100 heeft de gemeente nu €38–45M aan Fellenoord-vastgoed in handen. Huurders van beide panden worden actief op zoek naar vervangende locaties,  dit is een van de sterkste verhuistriggers in Eindhoven momenteel.',
      },
      {
        adres: 'Professor Dr Dorgelolaan 20, Eindhoven',
        verkoper: 'VB Groep',
        koper: 'Rijksvastgoedbedrijf',
        koopsom: '~€12–14M',
        datum: 'april 2025',
        context: 'Rijksoverheid verwerft pand voor eigen gebruik. Bestaande huurders zoeken vervangende kantoorruimte in Eindhoven,  een groep met bekende eisen en budgetten, direct inzetbaar voor Smart Moves of D&B.',
      },
      {
        adres: 'Visserstraat 18A, Eindhoven',
        verkoper: 'Verouden Vastgoed / Kragt',
        koper: 'BPD Ontwikkeling',
        koopsom: '~€7–8M',
        datum: 'december 2024',
        context: 'BPD is woningontwikkelaar en koopt dit pand voor transformatie naar wonen. Dit vergroot de transformatiedruk op het kantoorbestand in Fellenoord en versterkt de noodzaak voor huurders om actief alternatieve kantoorlocaties te zoeken.',
      },
    ],
  },
]

const STAD_COLORS: Record<'eindhoven' | 'rotterdam', { accent: string; accentLight: string; accentBorder: string; badge: string; badgeText: string }> = {
  eindhoven: { accent: '#ff7f50', accentLight: '#fff5f0', accentBorder: '#ffd4c0', badge: '#fff0e8', badgeText: '#c2410c' },
  rotterdam: { accent: '#3b82f6', accentLight: '#eff6ff', accentBorder: '#bfdbfe', badge: '#eff6ff', badgeText: '#1e40af' },
}

function RecenteTransactiesPanel() {
  const [open, setOpen] = useState(false)

  const totalCount = TRANSACTIES_DATA.reduce((s, g) => s + g.transacties.length, 0)

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
              Recente Transacties <span style={{ fontWeight: 400, color: 'var(--c-muted)' }}>(laatste 24 maanden)</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
              Koper · Verkoper · Koopsom · Strategische context,  bron: Vastgoeddata.nl
            </div>
          </div>
          <span
            style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', flexShrink: 0,
            }}
          >
            {totalCount} transacties · 6 gebieden
          </span>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {TRANSACTIES_DATA.map((gebied) => {
            const colors = STAD_COLORS[gebied.stad]
            return (
              <div key={gebied.id}>
                {/* Gebied header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: colors.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
                    {gebied.naam}
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20,
                      background: colors.badge, color: colors.badgeText, border: `1px solid ${colors.accentBorder}`,
                    }}
                  >
                    {gebied.stad === 'eindhoven' ? 'Eindhoven' : 'Rotterdam'}
                  </span>
                  <BronTooltip bron={BRONNEN.transacties} />
                </div>

                {/* Transacties grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {gebied.transacties.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        background: colors.accentLight,
                        border: `1px solid ${colors.accentBorder}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                      }}
                    >
                      {/* Adres */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8 }}>
                        <EditableText storageKey={`transactie.${gebied.id}.${i}.adres`} defaultValue={t.adres} />
                      </div>

                      {/* Verkoper → Koper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 8px' }}>
                          <EditableText storageKey={`transactie.${gebied.id}.${i}.verkoper`} defaultValue={t.verkoper} />
                        </span>
                        <span style={{ fontSize: 11, color: colors.accent, fontWeight: 700 }}>→</span>
                        <span style={{ fontSize: 11, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 8px' }}>
                          <EditableText storageKey={`transactie.${gebied.id}.${i}.koper`} defaultValue={t.koper} />
                        </span>
                      </div>

                      {/* Koopsom + datum */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: colors.accent, color: '#fff',
                          }}
                        >
                          <EditableText storageKey={`transactie.${gebied.id}.${i}.koopsom`} defaultValue={t.koopsom} />
                        </span>
                        <span
                          style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)',
                          }}
                        >
                          <EditableText storageKey={`transactie.${gebied.id}.${i}.datum`} defaultValue={t.datum} />
                        </span>
                      </div>

                      {/* Context */}
                      <EditableText
                        storageKey={`transactie.${gebied.id}.${i}.context`}
                        defaultValue={t.context}
                        tag="div"
                        style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── VeldonderzoekPanel ────────────────────────────────────────────────────────

interface VeldonderzoekInzicht {
  citaat?: string
  toelichting?: string
  persoon: string
  organisatie: string
  datum: string
  stad?: 'eindhoven' | 'rotterdam' | 'both'
}

interface VeldonderzoekThema {
  id: string
  titel: string
  beschrijving: string
  inzichten: VeldonderzoekInzicht[]
}

const VELDONDERZOEK_THEMAS: VeldonderzoekThema[] = [
  {
    id: 'marktomvang',
    titel: 'Marktomvang en transactievolume',
    beschrijving: 'Beide markten zijn primair verplaatsingsmarkten voor mkb. Rotterdam is qua volume aanzienlijk groter; Eindhoven heeft een smallere zoekpopulatie boven de 1.000 m².',
    inzichten: [
      {
        toelichting: 'De Eindhovense markt is een vervangingsmarkt met een sweetspot van 500–600 m². Er zijn slechts circa tien actieve zoekers boven de 1.000 m², tegenover tachtig actieve zoekers onder die grens. Grote corporates (Big Four, hightechbedrijven) komen pas in beeld wanneer ze moeten heroverwegen.',
        persoon: 'Dirk Verberne',
        organisatie: 'Verschuuren & Schreppers Bedrijfsmakelaars',
        datum: '06/03/26',
        stad: 'eindhoven',
      },
      {
        toelichting: 'Rotterdam is een mkb-stad: circa 80% van de transacties zit qua aantallen onder de 500 m². Het merendeel betreft verplaatsingen binnen de stad,  weinig nieuwe toetreders van buiten. Mkb-klanten groeien mee van 200 naar 500, 1.000 of 1.500 m² bij een goede relatie.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Het totale transactievolume in Rotterdam ligt rond de 100.000 m²/jaar. De markt is gestabiliseerd na een periode van veel verhuisbewegingen. Rotterdam Centrum vertegenwoordigt circa 27.000–30.000 m²/jaar. Grotere transacties (5.000–15.000 m²) komen voor maar zijn beperkt in aantal.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Post-covid trek naar OV-knooppunten en "flight to quality": kwaliteit betekent niet alleen het gebouw, maar ook de omgeving, de beleving bij aankomst en de beschikbaarheid van voorzieningen. Inspiratie en beleving zijn leidende begrippen voor huurders.',
        persoon: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '07/04/26',
        stad: 'rotterdam',
      },
    ],
  },
  {
    id: 'huurcontractduren',
    titel: 'Huurcontractduren',
    beschrijving: 'De looptijd van huurcontracten verschilt sterk per segment en type gebouw. Nieuwbouw en langere contracten zijn de norm bij grotere huurders; kleinere huurders kiezen steeds vaker voor kortere looptijden.',
    inzichten: [
      {
        toelichting: 'Huurcontracten starten doorgaans bij vijf jaar voor alles vanaf 250 m². Bij nieuwbouw zoals The Red en Edge wordt tien jaar standaard aangehouden. Kleinere huurders kiezen vaker voor flexibele contracten van jaar tot jaar of maximaal drie jaar.',
        persoon: 'Dirk Verberne',
        organisatie: 'Verschuuren & Schreppers Bedrijfsmakelaars',
        datum: '06/03/26',
        stad: 'eindhoven',
      },
      {
        toelichting: 'Het vertrekpunt is vijf jaar, maar recent zijn er contracten gesloten van twee tot twintig jaar. Kleinere gebruikers onder 250 m² zitten vaak korter, omdat ze niet weten waar ze over vijf jaar staan. Het hangt af van de toekomstpotentie van het gebouw, de financiering van de eigenaar en het type gebruiker.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'De doorlooptijden van verhuurtrajecten zijn langer geworden in vergelijking met eerdere jaren. Huurovereenkomsten variëren sterk: winkelpanden kennen langere contracten dan kantoorruimten, maar er is geen vaste standaard.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
    ],
  },
  {
    id: 'turnkey',
    titel: 'Instapklare ruimten en turn-key vraag',
    beschrijving: 'De vraag naar instapklare kantoorruimte groeit, maar huurders schrikken terug bij het prijskaartje. Er is een duidelijk verschil tussen mkb <500 m² dat instapklaar wil en grotere huurders die eigen inrichtingskeuzes maken.',
    inzichten: [
      {
        toelichting: 'Instapklare kantoren zijn populair bij het segment onder 750 m²; grotere huurders met langere contracten (10 jaar bij nieuwbouw zoals Edge Eindhoven) maken liever eigen inrichtingskeuzes.',
        persoon: 'Dirk Verberne',
        organisatie: 'Verschuuren & Schreppers Bedrijfsmakelaars',
        datum: '06/03/26',
        stad: 'eindhoven',
      },
      {
        toelichting: 'Er is vraag naar instapklare ruimten, met name bij kleinere huurders. Bij grotere huurders boven de 500 m², als je ze aan de voorkant aanhaakts als ze willen blijven, voelen makelaars ook een morele verplichting om dat soort partijen op het juiste moment te introduceren.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Er is vraag naar instapklare ruimten, met name bij kleinere huurders. De Mik adviseert ook op het gebied van sale-and-leaseback en hold-sell-analyses, wat aangeeft dat het kantoor breder opereert dan puur verhuur.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'De vraag naar turnkey kantoorruimte groeit maar huurders schrikken terug bij het prijskaartje. NSI startte een pilot waarbij ook het 200–500 m²-segment turnkey wordt ingericht,  een trend die vanuit Londen via Amsterdam naar de rest van Nederland uitwaait.',
        persoon: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '07/04/26',
        stad: 'rotterdam',
      },
    ],
  },
  {
    id: 'fitout',
    titel: 'Fit-out kosten, inrichtingsmoment en wie betaalt',
    beschrijving: 'Huurders beginnen relatief vroeg in het verhuurtraject na te denken over inrichting. De kostenverhouding tussen eigenaar en huurder verschilt per segment en contractduur.',
    inzichten: [
      {
        toelichting: 'Huurders beginnen vanaf de tweede bezichtiging na te denken over inrichting,  zij willen weten wat de totale kosten inclusief afbouw zijn, want die moeten in de huurtermijn worden terugverdiend. Bij lange huurcontracten geeft de eigenaar soms een financiële bijdrage als incentive.',
        persoon: 'Dirk Verberne',
        organisatie: 'Verschuuren & Schreppers Bedrijfsmakelaars',
        datum: '06/03/26',
        stad: 'eindhoven',
      },
      {
        toelichting: 'Casco-klaar maken (pvc vloer, goed plafond, verlichting, geschilderde wanden à €200–300/m²) maakt aanzienlijk verschil in de huurprijs die een eigenaar kan realiseren. De echte inrichting (meubilair, binnenwanden, maatwerk) doen huurders zelf.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Fit-out kosten: referentie Varo Energy lag op €1.500/m², nu richting €2.000/m² voor het top-segment. Een basisfit-out om casco gereed te maken zit rond €200–300/m². Het DNA van de organisatie en wie er bij wie past, bepaalt uiteindelijk de keuze voor een inrichtingspartij.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Het Finest Offices Complex werkt met een BDA-concept (afbouwconcept) waarmee gebouwen aantrekkelijker worden voor huurders. De Mik begeleidt herpositionering en revitalisatie; zij brengen uitvoerende partijen in beeld maar de keuze wordt altijd samen met de opdrachtgever gemaakt.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
    ],
  },
  {
    id: 'samenwerking',
    titel: 'Makelaarsrelaties, acquisitie en toetreding nieuwe partij',
    beschrijving: 'Nieuwe samenwerkingen komen in beide markten vrijwel uitsluitend via bestaande contacten tot stand. Koude acquisitie werkt averechts. Wederkerigheid en snelheid zijn de sleutelwoorden voor een nieuwe D&B-partij zonder lokale vestiging.',
    inzichten: [
      {
        toelichting: 'Koude acquisitie via LinkedIn of directe mail werkt averechts,  je geeft aan "jeuk te willen krijgen". Netwerk via Dynamis-events (Provada) en wederkerigheid zijn de norm. Eindhoven heeft een overvloed aan lokale inrichtingspartijen (Hal2, King Kongs, VB Vastgoedinrichter, Dan Wack, Bureaubas); een nieuwkomer moet beginnen met één sterk referentieproject in de regio.',
        persoon: 'Dirk Verberne',
        organisatie: 'Verschuuren & Schreppers Bedrijfsmakelaars',
        datum: '06/03/26',
        stad: 'eindhoven',
      },
      {
        citaat: 'Partijen die alleen komen halen krijgen keurig een kopje koffie maar daarna blijft het bij. Het gaat niet om het financiële stukje maar meer om de wederkerigheid.',
        toelichting: 'Wederkerigheid is de sleutel: een inrichtingspartij die de makelaar introduceert bij opdrachtgevers creëert een morele verplichting voor een warme introductie terug. Er zijn geen formele courtageafspraken,  onafhankelijkheid is belangrijk.',
        persoon: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '12/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'De Mik werkt met Plan@Office als vaste D&B-partner, puur op vertrouwen en eerdere positieve ervaringen. Het doorslaggevende moment was niet een portfolio of presentatie, maar het gevoel dat afspraken worden nagekomen. Partijen die dat niet doen worden niet opnieuw ingeschakeld.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'Een lokale vestiging is geen principieel vereiste, maar snelheid en beschikbaarheid wegen zwaar. Een betrouwbare partij van buiten Rotterdam is welkom, mits dezelfde responsiviteit als een lokale partij wordt geboden.',
        persoon: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '19/03/26',
        stad: 'rotterdam',
      },
      {
        toelichting: 'NSI is als beursgenoteerde belegger verplicht te tenderen, maar uitgenodigde partijen komen uit het bestaande netwerk (Provada, Fresh-netwerkclub, interieurarchitecten als brug naar leveranciers). Track record plus marktconforme prijs geeft bij een volgend project een streepje voor.',
        persoon: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '07/04/26',
        stad: 'rotterdam',
      },
    ],
  },
]

const VELDONDERZOEK_STAD_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  eindhoven: { label: 'Eindhoven', bg: '#fff0e8', text: '#c2410c', border: '#ffd4c0' },
  rotterdam: { label: 'Rotterdam', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  both:      { label: 'Beide steden', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
}

const VELDONDERZOEK_BRON = 'Veldonderzoek Ditt. Officemakers (2026). Interne interviews (Bijlage 6), vastgoedbeslissers (Bijlage 7) en makelaarsinterviews doelregio\'s (Bijlage 9). Verantwoordingsverslag Ditt. Officemakers.'

const DELETED_KEY = 'veldonderzoek_deleted'

function useDeletedCards() {
  const [deleted, setDeleted] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + DELETED_KEY)
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })

  function deleteCard(id: string) {
    setDeleted(prev => {
      const next = new Set(prev)
      next.add(id)
      const arr = [...next]
      localStorage.setItem(STORAGE_PREFIX + DELETED_KEY, JSON.stringify(arr))
      queueChange(DELETED_KEY, JSON.stringify(arr))
      return next
    })
  }

  return { deleted, deleteCard }
}

function VeldonderzoekPanel() {
  const [open, setOpen] = useState(false)
  const [activeThema, setActiveThema] = useState<string | null>(null)
  const { isEditMode } = useEditMode()
  const { deleted, deleteCard } = useDeletedCards()

  const totalInzichten = VELDONDERZOEK_THEMAS.reduce((s, t) => s + t.inzichten.length, 0)

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
              Trends en inzichten veldonderzoek in de doelregio's
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
              Veldinterviews met makelaars en gebouweigenaar in Rotterdam en Eindhoven,  Bijlage 9
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', flexShrink: 0 }}>
            {VELDONDERZOEK_THEMAS.length} thema's · {totalInzichten} inzichten
          </span>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {VELDONDERZOEK_THEMAS.map((thema) => {
            const isExpanded = activeThema === thema.id
            return (
              <div key={thema.id} style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveThema((prev) => (prev === thema.id ? null : thema.id))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '14px 16px', background: isExpanded ? '#f8f7f5' : 'var(--c-surface)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 3 }}>
                      <EditableText storageKey={`veldonderzoek.thema.${thema.id}.titel`} defaultValue={thema.titel} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.5 }}>
                      <EditableText storageKey={`veldonderzoek.thema.${thema.id}.beschrijving`} defaultValue={thema.beschrijving} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--c-subtle)' }}>{thema.inzichten.length} inzichten</span>
                    <span style={{ fontSize: 14, color: 'var(--c-subtle)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>↓</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {thema.inzichten.map((inzicht, i) => {
                      const cardId = `${thema.id}_${i}`
                      if (deleted.has(cardId)) return null
                      const badge = inzicht.stad ? VELDONDERZOEK_STAD_BADGE[inzicht.stad] : null
                      return (
                        <div
                          key={i}
                          style={{ position: 'relative', background: '#fafaf9', border: '1px solid var(--c-border)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          {/* Verwijder knop (alleen in edit mode) */}
                          {isEditMode && (
                            <button
                              onClick={() => deleteCard(cardId)}
                              title="Kaart verwijderen"
                              style={{
                                position: 'absolute', top: 8, right: 8,
                                width: 20, height: 20, borderRadius: 4,
                                background: 'none', border: '1px solid #e2e8f0',
                                color: '#9ca3af', cursor: 'pointer', fontSize: 11,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                lineHeight: 1,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                            >
                              ×
                            </button>
                          )}

                          {/* Badge row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingRight: isEditMode ? 24 : 0 }}>
                            {badge && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
                                {badge.label}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>
                              <EditableText storageKey={`veldonderzoek.inzicht.${thema.id}.${i}.datum`} defaultValue={inzicht.datum} />
                            </span>
                            <BronTooltip bron={VELDONDERZOEK_BRON} />
                          </div>

                          {/* Citaat */}
                          {inzicht.citaat && (
                            <blockquote style={{ margin: 0, padding: '8px 12px', borderLeft: '3px solid #e2e8f0', background: '#fff', borderRadius: '0 6px 6px 0' }}>
                              <EditableText
                                multiline
                                storageKey={`veldonderzoek.inzicht.${thema.id}.${i}.citaat`}
                                defaultValue={inzicht.citaat}
                                tag="div"
                                style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.6, fontStyle: 'italic' }}
                              />
                            </blockquote>
                          )}

                          {/* Toelichting */}
                          {inzicht.toelichting && (
                            <EditableText
                              multiline
                              storageKey={`veldonderzoek.inzicht.${thema.id}.${i}.toelichting`}
                              defaultValue={inzicht.toelichting}
                              tag="div"
                              style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}
                            />
                          )}

                          {/* Persoon + organisatie */}
                          <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--c-border)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>
                              <EditableText storageKey={`veldonderzoek.inzicht.${thema.id}.${i}.persoon`} defaultValue={inzicht.persoon} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--c-muted)' }}>
                              <EditableText storageKey={`veldonderzoek.inzicht.${thema.id}.${i}.organisatie`} defaultValue={inzicht.organisatie} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Market Cap ────────────────────────────────────────────────────────────────

const MARKTCAP_BRON = 'Mesterom, D. (2026). Market cap berekening doelregio\'s. Intern document Ditt. Officemakers. Leegstand: Vastgoeddata.nl / JLL (2026). Concurrentie-aandeel: eigen inschatting o.b.v. marktanalyse.'

interface MarktCapStad {
  naam:        string
  leegstandM2: number
  partijen:    number
  penetratie:  number
  dittM2:      number
  defaultPrijs: number
  concurrenten: string
}

const MARKTCAP_STEDEN: MarktCapStad[] = [
  {
    naam:         'Eindhoven',
    leegstandM2:  127_062,
    partijen:     3,
    penetratie:   0.40,
    dittM2:       16_941,
    defaultPrijs: 800,
    concurrenten: 'Duotone Interior Concepts, HAL 2',
  },
  {
    naam:         'Rotterdam',
    leegstandM2:  233_940,
    partijen:     4,
    penetratie:   0.40,
    dittM2:       23_394,
    defaultPrijs: 900,
    concurrenten: 'Sprank Interieurprojecten, Plan@Office, Leidmotiv',
  },
  {
    naam:         'Amsterdam',
    leegstandM2:  825_611,
    partijen:     6,
    penetratie:   0.40,
    dittM2:       66_048,
    defaultPrijs: 1_200,
    concurrenten: 'BESPARK, Tétris, WE MAKE, Stone Projects, Cerius',
  },
]

function fmEuro(n: number) {
  if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  return `€ ${Math.round(n / 1_000)} k`
}

// ── Begrotingscalculator doelregio ────────────────────────────────────────────

// Lookup tabellen uit Begrotingssheet 2026 - Intern.xlsx
const FITOUT_TABLE: Record<string, Record<string, number>> = {
  Open:        { Low: 350, Mid: 500, High: 700 },
  Hybrid:      { Low: 450, Mid: 600, High: 800 },
  Traditional: { Low: 550, Mid: 700, High: 900 },
}
const FURNITURE_TABLE: Record<string, number> = { Low: 250, Mid: 325, High: 400 }
const IDENTITY_TABLE:  Record<string, number>  = { Low: 50,  Mid: 75,  High: 100 }
const MEP_OPTIES = [
  { label: 'Basic 100',       value: 100 },
  { label: 'Basic 150',       value: 150 },
  { label: 'Basic 200',       value: 200 },
  { label: 'Medium 250',      value: 250 },
  { label: 'Medium 300',      value: 300 },
  { label: 'Medium 350',      value: 350 },
  { label: 'High 400',        value: 400 },
  { label: 'High 450',        value: 450 },
  { label: 'High 500',        value: 500 },
  { label: 'BREEAM 550',      value: 550 },
  { label: 'BREEAM 600',      value: 600 },
  { label: 'BREEAM 650',      value: 650 },
  { label: 'BREEAM High 700', value: 700 },
  { label: 'BREEAM High 750', value: 750 },
]

function calcBegroting(m2: number, type: string, fitoutLvl: string, furnitureLvl: string, identityLvl: string, mep: number) {
  const fp = FITOUT_TABLE[type][fitoutLvl]
  const up = FURNITURE_TABLE[furnitureLvl]
  const ip = IDENTITY_TABLE[identityLvl]
  const bouwplaats = 0.04
  // Excel: elk onderdeel ÷ (1 + bouwplaats%) zodat bouwplaats 4% = meerkosten bovenop
  const f = 1 / (1 + bouwplaats)
  const inv_fitout    = fp  * m2 * f
  const inv_furniture = up  * m2 * f
  const inv_identity  = ip  * m2 * f
  const inv_mep       = mep * m2 * f
  const sub           = inv_fitout + inv_furniture + inv_identity + inv_mep
  const inv_bouwplaats = sub * bouwplaats
  const total          = sub + inv_bouwplaats          // = (fp+up+ip+mep) * m2
  const inkoop =
    inv_fitout    * 0.65 +   // marge 35%
    inv_furniture * 0.65 +
    inv_identity  * 0.65 +
    inv_mep       * 0.90 +   // marge 10% (installaties)
    inv_bouwplaats * 0.65
  return {
    total,
    inkoop,
    marge: total > 0 ? (total - inkoop) / total : 0,
    prijs_per_m2: total / m2,
    details: {
      'Fitout':            { p: fp,  inv: inv_fitout },
      'Furniture':         { p: up,  inv: inv_furniture },
      'Identity':          { p: ip,  inv: inv_identity },
      'Installaties':      { p: mep, inv: inv_mep },
      'Bouwplaatsinrichting': { p: inv_bouwplaats / m2, inv: inv_bouwplaats },
    },
  }
}

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 8px',
  border: '1px solid var(--c-border)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text)',
  cursor: 'pointer',
  minWidth: 110,
}

type StadConfig = { type: string; fitout: string; furn: string; ident: string; mep: number }
const DEFAULT_STAD_CONFIG: StadConfig = { type: 'Hybrid', fitout: 'Mid', furn: 'Mid', ident: 'Mid', mep: 350 }

function BegrotingsDoelregioPanel({ partijOverrides }: { partijOverrides: Record<string, number> }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(MARKTCAP_STEDEN[0].naam)
  const [configs, setConfigs] = useState<Record<string, StadConfig>>(() =>
    Object.fromEntries(MARKTCAP_STEDEN.map((s) => [s.naam, { ...DEFAULT_STAD_CONFIG }]))
  )

  const niveauOpties = ['Low', 'Mid', 'High']

  function updateConfig(naam: string, patch: Partial<StadConfig>) {
    setConfigs((prev) => ({ ...prev, [naam]: { ...prev[naam], ...patch } }))
  }

  const steden = MARKTCAP_STEDEN.map((s) => {
    const cfg = configs[s.naam]
    const dittM2 = calcDittM2(s, partijOverrides)
    return { ...s, dittM2, cfg, calc: calcBegroting(dittM2, cfg.type, cfg.fitout, cfg.furn, cfg.ident, cfg.mep) }
  })

  const totaalInv    = steden.reduce((acc, x) => acc + x.calc.total, 0)
  const totaalInkoop = steden.reduce((acc, x) => acc + x.calc.inkoop, 0)
  const totaalMarge  = totaalInv > 0 ? (totaalInv - totaalInkoop) / totaalInv : 0

  const cfg = configs[selected]

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>
            Begrotingsindicatie,  metrage doelregio
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
            Kwaliteitsniveau × m² doelregio per stad · op basis van Begrotingssheet 2026 Premium
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px' }}>

          {/* Stad tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {MARKTCAP_STEDEN.map((s) => (
              <button
                key={s.naam}
                onClick={() => setSelected(s.naam)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--c-border)',
                  background: selected === s.naam ? '#1e293b' : 'white',
                  color: selected === s.naam ? 'white' : 'var(--c-text)',
                  fontSize: 12,
                  fontWeight: selected === s.naam ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {s.naam}
              </button>
            ))}
          </div>

          {/* Controls voor geselecteerde stad */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: '14px 16px', background: '#f8f7f5', borderRadius: 10, border: '1px solid var(--c-border)' }}>
            <div style={{ width: '100%', fontSize: 11, fontWeight: 700, color: 'var(--c-subtle)', marginBottom: -4 }}>
              Instellingen voor {selected}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type project</span>
              <select style={selectStyle} value={cfg.type} onChange={(e) => updateConfig(selected, { type: e.target.value })}>
                {['Open', 'Hybrid', 'Traditional'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fitout</span>
              <select style={selectStyle} value={cfg.fitout} onChange={(e) => updateConfig(selected, { fitout: e.target.value })}>
                {niveauOpties.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Furniture</span>
              <select style={selectStyle} value={cfg.furn} onChange={(e) => updateConfig(selected, { furn: e.target.value })}>
                {niveauOpties.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identity</span>
              <select style={selectStyle} value={cfg.ident} onChange={(e) => updateConfig(selected, { ident: e.target.value })}>
                {niveauOpties.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Installaties (€/m²)</span>
              <select style={selectStyle} value={cfg.mep} onChange={(e) => updateConfig(selected, { mep: Number(e.target.value) })}>
                {MEP_OPTIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>Prijs/m² (all-in)</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>
                € {(FITOUT_TABLE[cfg.type][cfg.fitout] + FURNITURE_TABLE[cfg.furn] + IDENTITY_TABLE[cfg.ident] + cfg.mep).toLocaleString('nl-NL')}/m²
              </span>
            </div>
          </div>

          {/* Per stad resultaten */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {steden.map((s) => {
              const c = s.calc
              const isSelected = s.naam === selected
              return (
                <div
                  key={s.naam}
                  onClick={() => setSelected(s.naam)}
                  style={{ background: isSelected ? '#f0f4ff' : '#f8f7f5', borderRadius: 10, padding: '14px 16px', border: `1px solid ${isSelected ? '#6366f1' : 'var(--c-border)'}`, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{s.naam}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
                        {s.dittM2.toLocaleString('nl-NL')} m² · {s.cfg.type} · {s.cfg.fitout}/{s.cfg.furn}/{s.cfg.ident} · € {Math.round(c.prijs_per_m2).toLocaleString('nl-NL')}/m²
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--c-subtle)' }}>Investering</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)' }}>{fmEuro(c.total)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--c-subtle)' }}>Inkoopprijs</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>{fmEuro(c.inkoop)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--c-subtle)' }}>Marge</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{(c.marge * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {Object.entries(c.details).map(([naam, d]) => (
                      <div key={naam} style={{ fontSize: 10, color: 'var(--c-muted)', background: 'white', borderRadius: 6, padding: '3px 8px', border: '1px solid var(--c-border)' }}>
                        {naam} · € {Math.round(d.p)}/m²
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totaal banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 10, padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Totaal investering ({MARKTCAP_STEDEN.length} steden)</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{fmEuro(totaalInv)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Totaal inkoopprijs</div>
              <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.85 }}>{fmEuro(totaalInkoop)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Gewogen marge</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{(totaalMarge * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 10, color: 'var(--c-subtle)' }}>
            Prijzen en marges op basis van Begrotingssheet 2026 Premium (intern). Bouwplaatsinrichting 4% inbegrepen. Installaties marge 10%, overige categorieën 35%. PM/ontwerp en overheads niet meegenomen.
          </div>
        </div>
      )}
    </div>
  )
}

function calcDittM2(s: MarktCapStad, partijOverrides: Record<string, number>) {
  const n = partijOverrides[s.naam] ?? s.partijen
  if (n === s.partijen) return s.dittM2
  return Math.round(s.dittM2 * s.partijen / n)
}

function MarketCapPanel({ partijOverrides, setPartijOverrides }: { partijOverrides: Record<string, number>; setPartijOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>> }) {
  const [prijzen, setPrijzen] = useState<Record<string, number>>(() =>
    Object.fromEntries(MARKTCAP_STEDEN.map((s) => [s.naam, s.defaultPrijs]))
  )

  const totaal = MARKTCAP_STEDEN.reduce((sum, s) => sum + calcDittM2(s, partijOverrides) * prijzen[s.naam], 0)

  const STAD_KLEUR: Record<string, string> = {
    Eindhoven: '#ff7f50',
    Rotterdam: '#5bb8c4',
    Amsterdam: '#8fc4a0',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 11, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
          <EditableText storageKey="marketcap-label" defaultValue="Marktpotentieel" />
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: '0 0 4px' }}>
          <EditableText storageKey="marketcap-titel" defaultValue="Wat is de market cap voor Ditt?" />
        </h2>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
          <EditableText storageKey="marketcap-intro" defaultValue="Op basis van leegstaand kantooroppervlak, het aantal actieve Design & Build-partijen en een marktpenetratie van 40%, is hieronder het omzetpotentieel per stad berekend. Pas de prijs per m² aan met de slider om scenario's te verkennen." />
        </p>
      </div>

      {/* Totaal banner */}
      <div style={{
        background: 'linear-gradient(135deg, #ff7f50 0%, #e8623a 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <EditableText storageKey="marketcap-banner-label" defaultValue="Totaal market cap (3 steden)" />
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {fmEuro(totaal)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '0 0 2px' }}><EditableText storageKey="marketcap-banner-aandeel-label" defaultValue="Ditt-aandeel m²" /></p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
            {(MARKTCAP_STEDEN.reduce((s, c) => s + calcDittM2(c, partijOverrides), 0)).toLocaleString('nl-NL')} m²
          </p>
        </div>
      </div>

      {/* Per stad */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MARKTCAP_STEDEN.map((stad) => {
          const prijs    = prijzen[stad.naam]
          const nPartijen = partijOverrides[stad.naam] ?? stad.partijen
          const dittM2   = calcDittM2(stad, partijOverrides)
          const cap      = dittM2 * prijs
          const kleur    = STAD_KLEUR[stad.naam]
          const barPct   = Math.round((cap / totaal) * 100)

          return (
            <div key={stad.naam} style={{
              background: '#fff',
              border: '1px solid var(--c-border)',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Stad naam + cap */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', margin: '0 0 2px' }}>
                    {stad.naam}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--c-subtle)', margin: 0 }}>
                    D&amp;B-partijen: {nPartijen} · Concurrenten: <EditableText storageKey={`marketcap-concurrenten-${stad.naam}`} defaultValue={stad.concurrenten} />
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: kleur, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {fmEuro(cap)}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--c-subtle)', margin: 0 }}>{barPct}% van totaal</p>
                </div>
              </div>

              {/* Voortgangsbalk */}
              <div style={{ height: 6, background: 'var(--c-border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: kleur, borderRadius: 3, transition: 'width 0.2s' }} />
              </div>

              {/* Formule,  uitklapbaar */}
              <details style={{ fontSize: 12 }}>
                <summary style={{
                  fontSize: 11,
                  color: 'var(--c-subtle)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span>ℹ</span> Berekeningswijze
                </summary>
                <div style={{
                  marginTop: 8,
                  background: '#f8f7f5',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: 'var(--c-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{stad.leegstandM2.toLocaleString('nl-NL')} m²</span>
                  <span style={{ color: 'var(--c-subtle)' }}>leegstand</span>
                  <span style={{ color: 'var(--c-subtle)' }}>÷</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setPartijOverrides(p => ({ ...p, [stad.naam]: Math.max(1, nPartijen - 1) }))}
                      style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid var(--c-border)', background: 'white', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 12, textAlign: 'center' }}>{nPartijen}</span>
                    <button onClick={() => setPartijOverrides(p => ({ ...p, [stad.naam]: nPartijen + 1 }))}
                      style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid var(--c-border)', background: 'white', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span>partijen</span>
                  </span>
                  <span style={{ color: 'var(--c-subtle)' }}>×</span>
                  <span>{Math.round(stad.penetratie * 100)}% penetratie</span>
                  <span style={{ color: 'var(--c-subtle)' }}>=</span>
                  <strong style={{ color: 'var(--c-text)' }}>{dittM2.toLocaleString('nl-NL')} m²</strong>
                  <span style={{ color: 'var(--c-subtle)' }}>×</span>
                  <strong style={{ color: kleur }}>€ {prijs.toLocaleString('nl-NL')}/m²</strong>
                  <span style={{ color: 'var(--c-subtle)' }}>=</span>
                  <strong style={{ color: 'var(--c-text)' }}>{fmEuro(cap)}</strong>
                  <BronTooltip bron={MARKTCAP_BRON} />
                </div>
              </details>

              {/* Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                    Prijs per m² aanpassen
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 700, color: kleur, fontVariantNumeric: 'tabular-nums' }}>
                    € {prijs.toLocaleString('nl-NL')}/m²
                    {prijs === stad.defaultPrijs && (
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c-subtle)', marginLeft: 4 }}>(standaard)</span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--c-subtle)', minWidth: 36 }}>€ 500</span>
                  <input
                    type="range"
                    min={500}
                    max={1500}
                    step={50}
                    value={prijs}
                    onChange={(e) => setPrijzen((prev) => ({ ...prev, [stad.naam]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: kleur, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--c-subtle)', minWidth: 42, textAlign: 'right' }}>€ 1.500</span>
                  <button
                    onClick={() => setPrijzen((prev) => ({ ...prev, [stad.naam]: stad.defaultPrijs }))}
                    title="Herstel standaard"
                    style={{
                      fontSize: 10,
                      color: prijs === stad.defaultPrijs ? 'var(--c-subtle)' : kleur,
                      background: 'none',
                      border: 'none',
                      cursor: prijs === stad.defaultPrijs ? 'default' : 'pointer',
                      padding: '2px 4px',
                      textDecoration: prijs !== stad.defaultPrijs ? 'underline' : 'none',
                    }}
                  >
                    reset
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PanelWrapper,  verberg paneel met × knop ──────────────────────────────────

function PanelWrapper({ hidden, onHide, editMode, children }: { hidden: boolean; onHide: () => void; editMode: boolean; children: React.ReactNode }) {
  if (hidden) return null
  return (
    <div style={{ position: 'relative' }}>
      {editMode && (
        <button
          onClick={onHide}
          title="Verberg dit paneel"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 22, height: 22, borderRadius: 4,
            background: 'none', border: '1px solid #e2e8f0',
            color: '#9ca3af', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
        >×</button>
      )}
      {children}
    </div>
  )
}

// ── ActieOverzichtView ────────────────────────────────────────────────────────


// Drempelcriteria,  minimale voorwaarden vóór acquisitie-inzet per stad
const DREMPEL_ITEMS = [
  'Minimaal 1 lokale makelaar geïdentificeerd & benaderd',
  'Minimaal 2 relevante gebouweigenaren in kaart',
  'Bestaande Ditt-relatie(s) als warme ingang geactiveerd',
  'Concurrenten en hun makelaarskanalen in kaart',
  'Doelregio en sweetspot m² vastgesteld',
]


function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 15, height: 15, borderRadius: 3, flexShrink: 0, cursor: 'pointer',
        border: `1.5px solid ${checked ? '#16a34a' : '#ccc'}`,
        background: checked ? '#16a34a' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

// ── Vier-fase trechterstructuur ───────────────────────────────────────────────

// Veldonderzoek-thema's die in Fase 1 worden getoond
const ORIËNTATIE_VELD_THEMAS = ['marktomvang', 'huurcontractduren', 'turnkey', 'fitout']

// ── Eindhoven gemeente-/marktstrategieblok ────────────────────────────────────

function EindhovenGemeenteStrategiePanel() {
  const [open, setOpen] = useState(false)

  const kansen = [
    {
      id: 'brainport',
      titel: 'Brainport Eindhoven,  Technologieregio 2030',
      context: 'Gemeente Eindhoven en de Brainport Development-agenda richten zich op behoud en groei van de hightech-maakindustrie rondom ASML, NXP en het HTC-ecosysteem. Dit genereert structurele vraag naar kantoor- en R&D-ruimte voor toeleveranciers die niet op de campus passen.',
      kleur: '#f59e0b', bg: '#fffbeb', border: '#fcd34d',
    },
    {
      id: 'fellenoord',
      titel: 'Fellenoord-transformatie,  verhuismoment 2026–2028',
      context: 'De gemeente koopt actief panden terug op Fellenoord (Kennedyplein 100 + 300, ~€38–45M). Zittende kantoorhuurders worden gedwongen te verhuizen,  directe stroom verhuisbewegingen richting centrum en Edge Eindhoven. Elk verhuismoment is een acquisitie-instappunt voor Ditt.',
      kleur: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe',
    },
    {
      id: 'stationsgebied',
      titel: 'Stationsgebied,  Flight to Quality',
      context: 'Edge Eindhoven (35.351 m²) op Stationsweg 17 positioneert het stationsgebied als nieuwe prime-locatie voor zakelijke dienstverlening en advocatuur. Prime huurprijzen stijgen naar €265/m²/jr. Elk contract dat hier wordt gesloten genereert een inrichtingsvraag.',
      kleur: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd',
    },
    {
      id: 'sweetspot',
      titel: 'Sweetspot Eindhovense markt: 500–600 m²',
      context: 'Circa 80 actieve zoekers zitten onder de 1.000 m². Slechts ~10 zoekers zijn actief boven die grens. Ditt\'s sweetspot (500–1.500 m²) sluit perfect aan op het dominante transactiesegment,  verplaatsingen van MKB en zakelijke dienstverleners.',
      kleur: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
    },
    {
      id: 'concurrentie',
      titel: 'Concurrentielandschap,  gat in het premium D&B-segment',
      context: 'HAL 2 B.V. domineert het MKB-segment (gem. ø 480 m²); Duotone Interior Concepts richt zich op enterprise (ø 970 m², HTC). Tussen beide partijen is ruimte voor Ditt. als kwalitatieve D&B-specialist voor zakelijke dienstverleners op A-locaties.',
      kleur: '#0891b2', bg: '#f0f9ff', border: '#bae6fd',
    },
    {
      id: 'flightforum',
      titel: 'Flight Forum,  hoogste aanbodsdynamiek in Eindhoven',
      context: 'Flight Forum kent het hoogste aantal actief aangeboden kantoorobjecten van alle Eindhovense gebieden: 32 van de 205 objecten op Funda in Business, circa 16% van het totale aanbod. Dit duidt op hoge marktdynamiek en beschikbaarheid, wat acquisitiepotentieel oplevert voor renovatie- en herinrichtingsopdrachten.',
      kleur: '#0891b2', bg: '#f0f9ff', border: '#bae6fd',
    },
  ]

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>
            <EditableText storageKey="fase1.eind.strategie.paneltitel" defaultValue="Eindhovense kantoormarkt,  strategische context voor Ditt." />
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
            <EditableText storageKey="fase1.eind.strategie.panelsubtitel" defaultValue="Brainport 2030 · Fellenoord-transformatie · Sweetspot analyse · Concurrentie" />
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kansen.map((k) => (
            <div key={k.id} style={{ background: '#f8f7f5', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--c-border)' }}>
              <EditableText
                storageKey={`eind.strategie.${k.id}.titel`}
                defaultValue={k.titel}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, display: 'block' }}
              />
              <EditableText
                storageKey={`eind.strategie.${k.id}.tekst`}
                defaultValue={k.context}
                tag="div"
                multiline
                style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.7 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fase 1 Oriëntatie,  samengestelde inhoud per stad ─────────────────────────

function Fase1OrientatieContent({ stadNaam }: { stadNaam: string }) {
  const stadId = stadNaam.toLowerCase() as 'eindhoven' | 'rotterdam'
  const mc     = MARKTCAP_STEDEN.find((s) => s.naam === stadNaam)!
  const jll    = JLL[stadId]?.['Q4 2025']
  const stadVVO = STAD_KANTOOR_VVO[stadId] ?? 0

  const [openVeld,    setOpenVeld]    = useState(false)
  const [deletedVeld, setDeletedVeld] = useState<Set<string>>(new Set())

  const inzichtFilter = (inzicht: VeldonderzoekInzicht) =>
    !inzicht.stad || inzicht.stad === stadId || inzicht.stad === 'both'

  const veldThemas = VELDONDERZOEK_THEMAS.filter((t) => ORIËNTATIE_VELD_THEMAS.includes(t.id))

  const makelaarsQuotes = VELDONDERZOEK_THEMAS
    .flatMap((t) => t.inzichten)
    .filter((i) => i.citaat && inzichtFilter(i))

  const subLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 10,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* 1 · Marktinfo */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase1.${stadId}.sublabel.1`} defaultValue={`1 · Marktinfo ${stadNaam}`} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Totaal kantoor VVO',   value: fmM2(stadVVO) },
            { label: 'Leegstand (m²)',        value: mc.leegstandM2.toLocaleString('nl-NL') + ' m²' },
            { label: 'Vacancy rate (JLL)',    value: jll ? `${jll.vacancyRate}%` : ', ' },
            { label: 'Prime rent (JLL)',      value: jll ? `€${jll.primeRent}/m²` : ', ' },
            { label: 'Take-up 2025',          value: jll ? fmM2(jll.takeUp) : ', ' },
            { label: 'Pijplijn 2026–2030',   value: jll ? fmM2(jll.pipeline2030) : ', ' },
            { label: 'Ditt. doelregio (m²)', value: fmM2(mc.dittM2) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8f7f5', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.2 }}>{value}</div>
            </div>
          ))}
          <div style={{ background: '#f8f7f5', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginBottom: 3 }}>D&B-partijen actief</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.2 }}>
              <EditableText storageKey={`fase1.${stadId}.marktinfo.dbpartijen`} defaultValue={`${mc.partijen}`} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--c-muted)' }}>
          Concurrenten in scope: <span style={{ fontWeight: 600, color: 'var(--c-text)' }}>{mc.concurrenten}</span>
        </div>
      </div>

      {/* 2 · Omgevingskenmerken */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase1.${stadId}.sublabel.2`} defaultValue="2 · Omgevingskenmerken,  concurrentie & D&B-activiteit" /></div>
        {stadNaam === 'Eindhoven' ? <OmgevingskenmerkenPanel /> : <RotterdamOmgevingskenmerkenPanel />}
      </div>

      {/* 3 · Gemeente- / marktstrategieblok */}
      <div>
        <div style={subLabel}>
          <EditableText storageKey={`fase1.${stadId}.sublabel.3`} defaultValue={stadNaam === 'Rotterdam' ? '3 · Kantorenstrategie 2025–2035 (MRDH)' : '3 · Markt- & stedelijke strategie'} />
        </div>
        {stadNaam === 'Rotterdam' ? <RotterdamKantorenstrategiePanel /> : <EindhovenGemeenteStrategiePanel />}
      </div>

      {/* 3b · Leegstand per pand (Rotterdam only) */}
      {stadNaam === 'Rotterdam' && (
        <div>
          <div style={subLabel}><EditableText storageKey={`fase1.${stadId}.sublabel.3b`} defaultValue="3b · Beschikbaar aanbod,  leegstand per pand" /></div>
          <RotterdamLeegstandPanel />
        </div>
      )}


      {/* 4 · Veldonderzoek-inzichten,  uitklapbaar */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase1.${stadId}.sublabel.4`} defaultValue="4 · Veldonderzoek,  markt, huurcontracten & turn-key" /></div>
        <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
          <button
            onClick={() => setOpenVeld((o) => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
                <EditableText storageKey={`fase1.${stadId}.veld.paneltitel`} defaultValue="Veldonderzoek inzichten" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
                <EditableText storageKey={`fase1.${stadId}.veld.panelsubtitel`} defaultValue="Marktomvang · Huurcontractduren · Turn-key vraag · Fitoutkosten" />
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--c-subtle)', transform: openVeld ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
          </button>
          {openVeld && (
          <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deletedVeld.size > 0 && (
              <button
                onClick={() => setDeletedVeld(new Set())}
                style={{ fontSize: 11, color: 'var(--c-coral)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start', padding: 0 }}
              >
                {deletedVeld.size} kaart{deletedVeld.size > 1 ? 'en' : ''} verborgen,  herstel alles
              </button>
            )}
            {veldThemas.map((thema) => {
              const gefilterd = thema.inzichten
                .map((inzicht, allIdx) => ({ inzicht, allIdx }))
                .filter(({ inzicht, allIdx }) => inzichtFilter(inzicht) && !deletedVeld.has(`${thema.id}_${allIdx}`))
              if (gefilterd.length === 0) return null
              return (
                <div key={thema.id} style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#f8f7f5', borderBottom: '1px solid var(--c-border)' }}>
                    <EditableText storageKey={`fase1.veld.${stadId}.${thema.id}.titel`} defaultValue={thema.titel} style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', display: 'block' }} />
                    <EditableText storageKey={`fase1.veld.${stadId}.${thema.id}.beschr`} defaultValue={thema.beschrijving} style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2, display: 'block' }} />
                  </div>
                  <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {gefilterd.map(({ inzicht, allIdx }) => {
                      const badge   = inzicht.stad ? VELDONDERZOEK_STAD_BADGE[inzicht.stad] : null
                      const cardKey = `${thema.id}_${allIdx}`
                      const sk      = `fase1.veld.${stadId}.${thema.id}.${allIdx}`
                      return (
                        <div key={allIdx} style={{ background: '#fafaf9', border: '1px solid var(--c-border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                          <button
                            onClick={() => setDeletedVeld((prev) => new Set([...prev, cardKey]))}
                            title="Kaart verbergen"
                            style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 4, background: 'none', border: '1px solid #e2e8f0', color: '#9ca3af', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                          >×</button>
                          {badge && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, alignSelf: 'flex-start' }}>
                              {badge.label}
                            </span>
                          )}
                          {inzicht.citaat && (
                            <blockquote style={{ margin: 0, padding: '6px 10px', borderLeft: '3px solid #e2e8f0', background: '#fff', borderRadius: '0 6px 6px 0' }}>
                              <EditableText storageKey={`${sk}.citaat`} defaultValue={inzicht.citaat} multiline tag="div" style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.6, fontStyle: 'italic' }} />
                            </blockquote>
                          )}
                          <EditableText storageKey={`${sk}.toelichting`} defaultValue={inzicht.toelichting ?? ''} multiline tag="div" style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }} />
                          <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--c-border)' }}>
                            <EditableText storageKey={`${sk}.persoon`} defaultValue={inzicht.persoon} style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)', display: 'block' }} />
                            <EditableText storageKey={`${sk}.org`} defaultValue={inzicht.organisatie} style={{ fontSize: 10, color: 'var(--c-muted)', display: 'block' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>

      {/* 5 · Makelaars-quotes */}
      {makelaarsQuotes.length > 0 && (
        <div>
          <div style={subLabel}><EditableText storageKey={`fase1.${stadId}.sublabel.5`} defaultValue="5 · Makelaars-quotes,  directe uitspraken veldonderzoek" /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {makelaarsQuotes.map((inzicht, i) => {
              const badge = inzicht.stad ? VELDONDERZOEK_STAD_BADGE[inzicht.stad] : null
              return (
                <div key={i} style={{ background: '#fafaf9', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <blockquote style={{ margin: '0 0 10px', padding: '10px 14px', borderLeft: '3px solid #6366f1', background: '#fff', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.7, fontStyle: 'italic' }}>{inzicht.citaat}</div>
                  </blockquote>
                  {inzicht.toelichting && (
                    <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6, marginBottom: 8 }}>{inzicht.toelichting}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>{inzicht.persoon}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-muted)' }}>{inzicht.organisatie}</div>
                    </div>
                    {badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, marginLeft: 'auto' }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Fase 2 Netwerk opbouwen,  data & componenten ──────────────────────────────

const FASE2_VELD_THEMAS = ['samenwerking']

interface StadKanaalItem { aanpak: string; kapstok: string }

const KANALEN_PER_STAD: Record<string, Record<'makelaar' | 'eigenaar' | 'huurder', StadKanaalItem>> = {
  Eindhoven: {
    makelaar: {
      aanpak: 'Verschuuren & Schreppers en Maas Makelaars domineren het zakelijke segment. Vraag naar panden met aflopende contracten of actieve verhuurvragen. Wederkerigheid: introduceer Ditt bij hun klanten, zij leiden terug. Netwerk via Dynamis-events (Provada, 9–11 juni 2026, stand 10.31).',
      kapstok: 'Welke objecten in uw portefeuille hebben op dit moment een actieve verhuurvraag of aankomende huurdersmutatie?',
    },
    eigenaar: {
      aanpak: 'Focus op Fellenoord-transformatie en Edge Eindhoven-eigenaren. Geva Vastgoed (Strijp-T) en Edge Technologies zijn prioritaire targets. D&B verhoogt verhuurwaarde en combineert energielabel C-renovatie met interieurupgrade,  één aanspreekpunt van ontwerp tot oplevering.',
      kapstok: 'Heeft u plannen voor renovatie of herinrichting van uw pand in de komende 12–24 maanden?',
    },
    huurder: {
      aanpak: 'Sweetspot: 500–600 m², zakelijke dienstverleners en tech scale-ups. Instapklare behoefte bij <750 m²; grotere huurders willen eigen inrichtingskeuzes. Kom vroeg in het verhuurtraject,  al vanaf de 2e bezichtiging denken huurders aan inrichting.',
      kapstok: 'Hoe ziet uw ideale werkplek eruit en wat is uw tijdsplanning voor het betrekken van de nieuwe ruimte?',
    },
  },
  Rotterdam: {
    makelaar: {
      aanpak: 'Schaub & Partners (Maurits de Peuter) en De Mik Real Estate Partners (Marcel Naaktgeboren) zijn de prioritaire makelaars. Geen courtageafspraken,  maar wederkerigheid schept morele verplichtingen. Plan@Office is vaste D&B-partner van De Mik; Ditt moet dat vertrouwen verdienen met snelheid en nakoming. Netwerk via Provada (9–11 juni 2026, stand 12.06).',
      kapstok: 'Heeft u huurkandidaten met een strakke deadline die twijfelen vanwege de inrichtingstijd?',
    },
    eigenaar: {
      aanpak: 'NSI N.V. (Stefan Suurmond),  beursgenoteerd, tender-verplicht, maar partijen uit bestaand netwerk (Provada, Fresh-netwerkclub) worden uitgenodigd. Benadruk B Corp-score (89,5) en BREEAM-expertise. Kop van Zuid en Brainpark zijn de prioritaire gebieden.',
      kapstok: 'Hoe lang staat uw pand al leeg en hoe urgent is het om snel een huurder te huisvesten?',
    },
    huurder: {
      aanpak: 'Rotterdam is een mkb-stad: ~80% van transacties zit onder 500 m². Huurders denken al vanaf de 2e bezichtiging aan inrichting. Positioneer Fast Fit-Out voor tijddruk-cases; D&B voor verhuizers naar Kop van Zuid of Brainpark die willen dat hun kantoor hun ambitie uitstraalt.',
      kapstok: 'Wanneer moet u de nieuwe ruimte uiterlijk betrekken en hoeveel speelruimte heeft u in de planning?',
    },
  },
}

function useLocalContacts(stadId: string) {
  const key = `local_contacts_${stadId}`
  const [contacts, setContacts] = useState<WarmContact[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
  })
  function addContact(contact: WarmContact) {
    setContacts(prev => {
      const next = [...prev, contact]
      const json = JSON.stringify(next)
      localStorage.setItem(key, json)
      queueChange(key, json)
      return next
    })
  }
  function removeContact(id: string) {
    setContacts(prev => {
      const next = prev.filter(c => c.id !== id)
      const json = JSON.stringify(next)
      localStorage.setItem(key, json)
      queueChange(key, json)
      return next
    })
  }
  return { contacts, addContact, removeContact }
}

function NieuwContactForm({ onSave, onCancel }: { onSave: (c: WarmContact) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ naam: '', organisatie: '', rol: '', email: '', telefoon: '', notitie: '' })
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.naam.trim() || !form.organisatie.trim() || !form.rol.trim()) return
    onSave({
      id: `local_${Date.now()}`,
      naam: form.naam.trim(),
      organisatie: form.organisatie.trim(),
      rol: form.rol.trim(),
      email: form.email.trim(),
      telefoon: form.telefoon.trim(),
      notitie: form.notitie.trim(),
      datumLaatsteContact: new Date().toISOString().slice(0, 10),
    })
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 7,
    border: '1px solid #fcd34d', background: '#fffbeb', color: '#1a1a1a',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#92400e', display: 'block', marginBottom: 4 }
  return (
    <form onSubmit={submit} style={{ background: 'linear-gradient(160deg,#fffbeb 0%,#fefce8 100%)', border: '2px dashed #fcd34d', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#d97706', marginBottom: 4 }}>Nieuw warm contact</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Naam *</label>
          <input style={inputStyle} value={form.naam} onChange={set('naam')} placeholder="Volledige naam" required />
        </div>
        <div>
          <label style={labelStyle}>Organisatie *</label>
          <input style={inputStyle} value={form.organisatie} onChange={set('organisatie')} placeholder="Bedrijfsnaam" required />
        </div>
        <div>
          <label style={labelStyle}>Rol *</label>
          <input style={inputStyle} value={form.rol} onChange={set('rol')} placeholder="Functietitel" required />
        </div>
        <div>
          <label style={labelStyle}>Telefoon</label>
          <input style={inputStyle} value={form.telefoon} onChange={set('telefoon')} placeholder="+31..." />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>E-mail</label>
          <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="naam@bedrijf.nl" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Notitie</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notitie} onChange={set('notitie')} placeholder="Context, reden van contact, ..." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1px solid #fcd34d', background: 'transparent', color: '#92400e', cursor: 'pointer' }}>
          Annuleren
        </button>
        <button type="submit" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: 'none', background: '#d97706', color: '#fff', cursor: 'pointer' }}>
          Opslaan
        </button>
      </div>
    </form>
  )
}

function useDeletedItemsFase2(storageKey: string) {
  const [deleted, setDeleted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]')) } catch { return new Set() }
  })
  function deleteItem(id: string) {
    setDeleted(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(storageKey, JSON.stringify([...next]))
      queueChange(storageKey, JSON.stringify([...next]))
      return next
    })
  }
  return { deleted, deleteItem }
}

function F2DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const { isEditMode } = useEditMode()
  if (!isEditMode) return null
  return (
    <button
      onClick={onDelete}
      title="Kaart verwijderen"
      style={{
        position: 'absolute', top: 8, right: 8,
        width: 20, height: 20, borderRadius: 4,
        background: 'none', border: '1px solid #e2e8f0',
        color: '#9ca3af', cursor: 'pointer', fontSize: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
    >
      ×
    </button>
  )
}

function Fase2WarmContactCard({ contact, onDelete }: { contact: WarmContact; onDelete: () => void }) {
  const [showNote, setShowNote] = useState(false)
  const { isEditMode } = useEditMode()
  const sk = `wc.${contact.id}`

  // Read live values (localStorage overrides original contact data)
  const [email, setEmail]     = useState(() => getEditableText(`${sk}.email`, contact.email ?? ''))
  const [telefoon, setTelefoon] = useState(() => getEditableText(`${sk}.telefoon`, contact.telefoon ?? ''))

  const heeftEmail    = !!email
  const heeftTelefoon = !!telefoon
  const heeftNotitie  = !!(contact.notitie || getEditableText(`${sk}.notitie`, contact.notitie ?? ''))

  function saveField(field: string, value: string) {
    const key = `${sk}.${field}`
    if (value.trim()) {
      localStorage.setItem(STORAGE_PREFIX + key, value.trim())
      queueChange(key, value.trim())
    } else {
      localStorage.removeItem(STORAGE_PREFIX + key)
      queueChange(key, null)
    }
  }

  function nlDatum(iso: string) {
    const p = iso.split('-')
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso
  }

  return (
    <div style={{
      background: 'linear-gradient(160deg, #fffbeb 0%, #fefce8 100%)',
      border: '1px solid #fcd34d',
      borderLeft: '4px solid #d97706',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(217,119,6,0.08)',
      position: 'relative',
    }}>
      <F2DeleteBtn onDelete={onDelete} />
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <EditableText storageKey={`${sk}.naam`} defaultValue={contact.naam} style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }} />
            <EditableText storageKey={`${sk}.organisatie`} defaultValue={contact.organisatie} style={{ fontSize: 12, color: '#78716c', marginTop: 2, display: 'block' }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: '#d97706', color: '#fff', flexShrink: 0 }}>
            Warm contact
          </span>
        </div>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
          <EditableText storageKey={`${sk}.rol`} defaultValue={contact.rol} />
        </span>
        {contact.datumLaatsteContact && (
          <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 10, color: '#a8a29e' }}>
            Laatste contact: {nlDatum(contact.datumLaatsteContact)}
          </span>
        )}
      </div>

      {/* Edit mode: inline email + telefoon inputs */}
      {isEditMode && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #fde68a', background: 'rgba(255,255,255,0.5)', display: 'flex', gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => saveField('email', e.target.value)}
            placeholder="E-mailadres"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#1a1a1a', outline: 'none' }}
          />
          <input
            value={telefoon}
            onChange={(e) => setTelefoon(e.target.value)}
            onBlur={(e) => saveField('telefoon', e.target.value)}
            placeholder="Telefoonnummer"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#1a1a1a', outline: 'none' }}
          />
        </div>
      )}

      <div style={{ padding: '10px 16px', borderTop: '1px solid #fde68a', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* E-mail knop */}
        <a
          href={heeftEmail ? `mailto:${email}` : undefined}
          onClick={(e) => { if (!heeftEmail) e.preventDefault(); e.stopPropagation() }}
          title={heeftEmail ? email : 'E-mail onbekend'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, textDecoration: 'none', transition: 'opacity 0.15s',
            background: heeftEmail ? 'var(--c-coral)' : '#fef3c7',
            border: heeftEmail ? 'none' : '1px solid #fcd34d',
            cursor: heeftEmail ? 'pointer' : 'default',
            opacity: heeftEmail ? 1 : 0.5, flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={heeftEmail ? '#fff' : '#92400e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="2,4 12,13 22,4"/>
          </svg>
        </a>
        {/* Bel knop */}
        <a
          href={heeftTelefoon ? `tel:${telefoon}` : undefined}
          onClick={(e) => { if (!heeftTelefoon) e.preventDefault(); e.stopPropagation() }}
          title={heeftTelefoon ? telefoon : 'Telefoon onbekend'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, textDecoration: 'none', transition: 'opacity 0.15s',
            background: heeftTelefoon ? 'var(--c-coral)' : '#fef3c7',
            border: heeftTelefoon ? 'none' : '1px solid #fcd34d',
            cursor: heeftTelefoon ? 'pointer' : 'default',
            opacity: heeftTelefoon ? 1 : 0.5, flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={heeftTelefoon ? '#fff' : '#92400e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </a>
        {heeftNotitie && (
          <button
            onClick={() => setShowNote((s) => !s)}
            style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 12, transition: 'transform 0.15s', display: 'inline-block', transform: showNote ? 'rotate(90deg)' : 'none' }}>›</span>
            {showNote ? 'Verberg notitie' : 'Toon notitie'}
          </button>
        )}
      </div>

      {showNote && (
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #fde68a', background: 'rgba(255,255,255,0.6)' }}>
          <EditableText storageKey={`${sk}.notitie`} defaultValue={contact.notitie ?? ''} multiline tag="div" style={{ fontSize: 12, color: '#78716c', lineHeight: 1.75 }} />
        </div>
      )}
    </div>
  )
}

// Contactprotocol inhoud per product × partijtype (makelaars + eigenaren)
type F2Product   = 'design-and-build' | 'fast-fit-out' | 'detail-and-build'
type F2Partij    = 'makelaar' | 'eigenaar'

interface F2ProtocolInhoud { aanpak: string; kapstok: string }

const F2_PROTOCOL: Record<F2Product, Record<F2Partij, F2ProtocolInhoud>> = {
  'design-and-build': {
    makelaar: {
      aanpak:   'Vraag naar panden in portefeuille met verhuurleegstand of aankomende mutaties. Positioneer D&B als compleet inrichtingsconcept voor nieuwe huurders,  verhoogt aantrekkingskracht zonder risico voor de eigenaar.',
      kapstok:  'Welke objecten in uw portefeuille hebben op dit moment een actieve verhuurvraag of aankomende huurdersmutatie?',
    },
    eigenaar: {
      aanpak:   'Presenteer D&B als totaaloplossing bij herinrichting of renovatie. Nadruk op ontzorging: één aanspreekpunt van ontwerp tot oplevering, vaste prijs, bewezen proces.',
      kapstok:  'Heeft u plannen voor renovatie of herinrichting van uw pand in de komende 12–24 maanden?',
    },
  },
  'fast-fit-out': {
    makelaar: {
      aanpak:   'Uw sterkste troef bij huurkandidaten met tijdsdruk: vaste prijs, bewezen concept, snelle realisatie. Inzetbaar als doorslaggevend argument in concurrerende verhuursituaties.',
      kapstok:  'Heeft u huurkandidaten met een strakke deadline die twijfelen vanwege de inrichtingstijd?',
    },
    eigenaar: {
      aanpak:   'Verhoog bezettingsgraad door snel op te leveren. Geschikt voor objecten waar snelheid boven volledig maatwerk gaat. Beperkt risico, direct resultaat.',
      kapstok:  'Hoe lang staat uw pand al leeg en hoe urgent is het om snel een huurder te huisvesten?',
    },
  },
  'detail-and-build': {
    makelaar: {
      aanpak:   'Wanneer een huurkandidaat al een architect heeft geselecteerd, positioneer Ditt als de uitvoerende partner die het ontwerp naadloos vertaalt naar realisatie. De architect blijft verantwoordelijk voor het ontwerp, Ditt voor de oplevering.',
      kapstok:  'Heeft u huurkandidaten die al met een eigen architect werken maar nog een betrouwbare uitvoerende partij zoeken?',
    },
    eigenaar: {
      aanpak:   'Ideaal voor objecten waarbij de huurder of eigenaar al een architectenbureau heeft geselecteerd. Ditt treedt op als uitvoerend partner,  één aanspreekpunt voor de volledige bouwfase, zonder vertraging en binnen budget.',
      kapstok:  'Werkt de toekomstige gebruiker van uw pand al met een architect? Dan kan Ditt de uitvoering volledig overnemen.',
    },
  },
}

const F2_SLIDES: Record<F2Product, Record<F2Partij, { nr: number; omschrijving: string }[]>> = {
  'design-and-build': {
    makelaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 31, omschrijving: 'Dienstenoverzicht,  D&B, Detail & Build, Consultancy' },
      { nr: 43, omschrijving: 'Samenwerking,  wij werken graag samen met makelaars' },
      { nr: 45, omschrijving: 'The Office Lifecycle,  vroeg betrokken = meer impact' },
    ],
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 32, omschrijving: 'Design & Build Specialist,  van schets tot sleuteloverdracht' },
      { nr: 45, omschrijving: 'The Office Lifecycle,  van consultancy tot oplevering' },
      { nr: 49, omschrijving: 'Storytelling,  een gebouw is meer dan een bouwproject' },
      { nr: 20, omschrijving: 'B Corp 89,5,  duurzaamheid als verhuurargument' },
    ],
  },
  'fast-fit-out': {
    makelaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 31, omschrijving: 'Dienstenoverzicht,  Fast Fit-Out als snel inzetbaar concept' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA, WELL, 65+ specialisten' },
      { nr: 99, omschrijving: 'Planningsoverzicht,  vaste doorlooptijd, geen verrassingen' },
    ],
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  bewezen concept, snelle realisatie' },
      { nr: 99, omschrijving: 'Planningsoverzicht,  tijdlijn en mijlpalen' },
      { nr: 20, omschrijving: 'B Corp 89,5,  duurzame materialen standaard' },
    ],
  },
  'detail-and-build': {
    makelaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 31, omschrijving: 'Dienstenoverzicht,  Detail & Build als uitvoeringspartner' },
      { nr: 54, omschrijving: 'D&B organogram,  Ditt als bouwpartner naast architect' },
      { nr: 43, omschrijving: 'Samenwerking,  prettige partner bij complexe opgaven' },
    ],
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 54, omschrijving: 'D&B organogram,  architect ontwerpt, Ditt bouwt' },
      { nr: 43, omschrijving: 'Samenwerking,  van dag 1 betrokken bij het team' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA, WELL, betrouwbare uitvoering' },
    ],
  },
}

const F2_PRODUCTEN: { id: F2Product; label: string }[] = [
  { id: 'design-and-build',  label: 'Design & Build'  },
  { id: 'fast-fit-out',      label: 'Fast Fit-Out'    },
  { id: 'detail-and-build',  label: 'Detail & Build'  },
]

// ── Warm contact card voor gekoppelde prioriteitsgebieden ────────────────────

interface GebiedBadge { label: string; bg: string; text: string; border: string }

function PrioriteitWarmContactCard({ contact, gebiedBadge }: { contact: WarmContact & { gebiedNaam: string }; gebiedBadge: GebiedBadge }) {
  const sk = `wc.${contact.id}`
  const [email,    setEmail]    = useState(() => getEditableText(`${sk}.email`,    contact.email    ?? ''))
  const [telefoon, setTelefoon] = useState(() => getEditableText(`${sk}.telefoon`, contact.telefoon ?? ''))
  const [showNote, setShowNote] = useState(false)
  const { isEditMode } = useEditMode()

  const heeftEmail    = !!email
  const heeftTelefoon = !!telefoon
  const heeftNotitie  = !!(contact.notitie || getEditableText(`${sk}.notitie`, contact.notitie ?? ''))

  function saveField(field: string, value: string) {
    const key = `${sk}.${field}`
    if (value.trim()) {
      localStorage.setItem(STORAGE_PREFIX + key, value.trim())
      queueChange(key, value.trim())
    } else {
      localStorage.removeItem(STORAGE_PREFIX + key)
      queueChange(key, null)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #fffbeb 0%, #fefce8 100%)', border: '1px solid #fcd34d', borderLeft: '4px solid #d97706', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(217,119,6,0.08)' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <EditableText storageKey={`${sk}.naam`} defaultValue={contact.naam || ', '} style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }} />
            <EditableText storageKey={`${sk}.organisatie`} defaultValue={contact.organisatie} style={{ fontSize: 12, color: '#78716c', marginTop: 2, display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: '#d97706', color: '#fff' }}>
              Warm contact
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: gebiedBadge.bg, color: gebiedBadge.text, border: `1px solid ${gebiedBadge.border}` }}>
              {gebiedBadge.label}
            </span>
          </div>
        </div>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
          <EditableText storageKey={`${sk}.rol`} defaultValue={contact.rol} />
        </span>
      </div>

      {/* Edit mode: e-mail + telefoon invoer */}
      {isEditMode && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #fde68a', background: 'rgba(255,255,255,0.5)', display: 'flex', gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => saveField('email', e.target.value)}
            placeholder="E-mailadres"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#1a1a1a', outline: 'none' }}
          />
          <input
            value={telefoon}
            onChange={(e) => setTelefoon(e.target.value)}
            onBlur={(e) => saveField('telefoon', e.target.value)}
            placeholder="Telefoonnummer"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#1a1a1a', outline: 'none' }}
          />
        </div>
      )}

      {/* Actieknoppen */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #fde68a', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* E-mail */}
        <a
          href={heeftEmail ? `mailto:${email}` : undefined}
          onClick={(e) => { if (!heeftEmail) e.preventDefault() }}
          title={heeftEmail ? email : 'E-mail onbekend'}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, textDecoration: 'none', background: heeftEmail ? 'var(--c-coral)' : '#fef3c7', border: heeftEmail ? 'none' : '1px solid #fcd34d', cursor: heeftEmail ? 'pointer' : 'default', opacity: heeftEmail ? 1 : 0.5, flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={heeftEmail ? '#fff' : '#92400e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
          </svg>
        </a>
        {/* Bellen */}
        <a
          href={heeftTelefoon ? `tel:${telefoon}` : undefined}
          onClick={(e) => { if (!heeftTelefoon) e.preventDefault() }}
          title={heeftTelefoon ? telefoon : 'Telefoon onbekend'}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, textDecoration: 'none', background: heeftTelefoon ? 'var(--c-coral)' : '#fef3c7', border: heeftTelefoon ? 'none' : '1px solid #fcd34d', cursor: heeftTelefoon ? 'pointer' : 'default', opacity: heeftTelefoon ? 1 : 0.5, flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={heeftTelefoon ? '#fff' : '#92400e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </a>
        {/* Notitie toggle */}
        {heeftNotitie && (
          <button
            onClick={() => setShowNote((s) => !s)}
            style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 12, transition: 'transform 0.15s', display: 'inline-block', transform: showNote ? 'rotate(90deg)' : 'none' }}>›</span>
            {showNote ? 'Verberg notitie' : 'Toon notitie'}
          </button>
        )}
      </div>

      {/* Notitie */}
      {showNote && (
        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #fde68a', background: 'rgba(255,255,255,0.6)' }}>
          <EditableText storageKey={`${sk}.notitie`} defaultValue={contact.notitie ?? ''} tag="div" multiline style={{ fontSize: 11, color: '#78716c', lineHeight: 1.6, fontStyle: 'italic' }} />
        </div>
      )}
    </div>
  )
}

// ── Lead card voor gekoppelde prioriteitsgebieden ────────────────────────────

function PrioriteitLeadCard({ lead, gebiedBadge }: { lead: KansrijkeLead & { gebiedNaam: string }; gebiedBadge: GebiedBadge }) {
  const [showBegroting, setShowBegroting] = useState(false)
  const sk = `prioriteit.lead.${lead.id}`

  const [jaar, maand] = lead.contractBegin.split('-')
  const maandNamen = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
  const eindJaar  = parseInt(jaar) + 5
  const eindLabel = `${maandNamen[parseInt(maand) - 1]} ${eindJaar}`

  const [year, month] = lead.contractBegin.split('-').map(Number)
  const afloop  = new Date(year + 5, month - 1, 1)
  const now     = new Date()
  const maanden = (afloop.getFullYear() - now.getFullYear()) * 12 + (afloop.getMonth() - now.getMonth())
  const u = maanden < 12
    ? { label: '< 1 jaar',   bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' }
    : maanden < 24
    ? { label: '1 – 2 jaar', bg: '#fff7ed', text: '#9a3412', dot: '#f97316' }
    : { label: '> 2 jaar',   bg: '#f0fdf4', text: '#166534', dot: '#22c55e' }

  const [begType,      setBegType]      = useState('Hybrid')
  const [begFitout,    setBegFitout]    = useState('Mid')
  const [begFurniture, setBegFurniture] = useState('Mid')
  const [begIdentity,  setBegIdentity]  = useState('Mid')
  const [begMep,       setBegMep]       = useState(350)

  const beg = calcBegroting(lead.omvang, begType, begFitout, begFurniture, begIdentity, begMep)
  const fmt = (n: number) => `€${(n / 1000).toFixed(0)}k`

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderLeft: '4px solid var(--c-coral)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        {/* Badges rij */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: gebiedBadge.bg, color: gebiedBadge.text, border: `1px solid ${gebiedBadge.border}` }}>
            <EditableText storageKey={`${sk}.gebiedbadge`} defaultValue={gebiedBadge.label} />
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: u.bg, color: u.text }}>
            <EditableText storageKey={`${sk}.urgentie`} defaultValue={u.label} />
          </span>
        </div>

        {/* Huurder */}
        <EditableText
          storageKey={`${sk}.huurder`}
          defaultValue={lead.huurder}
          style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', display: 'block' }}
        />
        <EditableText
          storageKey={`${sk}.branche`}
          defaultValue={lead.branche}
          style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2, display: 'block' }}
        />

        {/* Pand + m² */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#f8f7f5', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
            <EditableText storageKey={`${sk}.pandnaam`} defaultValue={lead.pandnaam} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f8f7f5', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
            <EditableText storageKey={`${sk}.omvang`} defaultValue={`${lead.omvang.toLocaleString('nl-NL')} m²`} />
          </span>
          {lead.huurprijsPerM2 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
              <EditableText storageKey={`${sk}.huurprijs`} defaultValue={`€${lead.huurprijsPerM2}/m²/jr`} />
            </span>
          )}
        </div>

        {/* Contract einddatum */}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--c-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.dot, flexShrink: 0, display: 'inline-block' }} />
          <EditableText storageKey={`${sk}.eindlabel.prefix`} defaultValue="Contract eindigt ~" />
          <EditableText storageKey={`${sk}.eindlabel`} defaultValue={eindLabel} style={{ fontWeight: 600, color: 'var(--c-text)' }} />
        </div>
      </div>

      {/* Begrotingindicator toggle */}
      <div style={{ borderTop: '1px solid var(--c-border)' }}>
        <button
          onClick={() => setShowBegroting((s) => !s)}
          style={{ width: '100%', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#60a5fa' }}
        >
          <EditableText storageKey={`${sk}.begroting.label`} defaultValue="Begrotingsindicatie" style={{ pointerEvents: 'none' }} />
          <span style={{ fontSize: 12, transform: showBegroting ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        </button>
        {showBegroting && (
          <div style={{ margin: '0 16px 14px', background: '#0f172a', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {/* Header */}
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: '#60a5fa', textTransform: 'uppercase' }}>
                Begrotingsindicatie
              </span>
            </div>

            {/* Dropdowns */}
            <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</div>
                <select value={begType} onChange={e => setBegType(e.target.value)} style={{ ...selectStyle, width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
                  {['Open','Hybrid','Traditional'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fitout</div>
                <select value={begFitout} onChange={e => setBegFitout(e.target.value)} style={{ ...selectStyle, width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
                  {['Low','Mid','High'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Furniture</div>
                <select value={begFurniture} onChange={e => setBegFurniture(e.target.value)} style={{ ...selectStyle, width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
                  {['Low','Mid','High'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identity</div>
                <select value={begIdentity} onChange={e => setBegIdentity(e.target.value)} style={{ ...selectStyle, width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
                  {['Low','Mid','High'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Installaties</div>
                <select value={begMep} onChange={e => setBegMep(Number(e.target.value))} style={{ ...selectStyle, width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}>
                  {MEP_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Result panel */}
            <div style={{ margin: '0 14px 12px', background: '#1e293b', borderRadius: 8, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
              <div style={{ textAlign: 'center', borderRight: '1px solid #334155' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Investering</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{fmt(beg.total)}</div>
                <div style={{ fontSize: 9, color: '#60a5fa', marginTop: 2 }}>€{Math.round(beg.prijs_per_m2)}/m²</div>
              </div>
              <div style={{ textAlign: 'center', borderRight: '1px solid #334155' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Inkoop</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{fmt(beg.inkoop)}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>&nbsp;</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Marge</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#34d399' }}>{(beg.marge * 100).toFixed(1)}%</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>&nbsp;</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 14px 10px', fontSize: 9, color: '#475569', textAlign: 'center' }}>
              {lead.omvang.toLocaleString('nl-NL')} m² · Begrotingssheet 2026 Premium · bouwplaats 4% inbegrepen
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FASE-FASE 3: Actief prospecting ──────────────────────────────────────────

type OntwikkelingFaseBadge = { label: string; bg: string; text: string }
const FASE_BADGE: Record<string, OntwikkelingFaseBadge> = {
  planfase:   { label: 'Planfase',   bg: '#f1f5f9', text: '#475569' },
  vergunning: { label: 'Vergunning', bg: '#fefce8', text: '#854d0e' },
  bouw:       { label: 'Bouw',       bg: '#fff7ed', text: '#c2410c' },
  oplevering: { label: 'Oplevering', bg: '#f0fdf4', text: '#166534' },
}

function Fase3ProspectingContent({ stadNaam }: { stadNaam: string }) {
  const { allSteden: steden } = useAllSteden()
  const stadId = stadNaam.toLowerCase() as 'eindhoven' | 'rotterdam'
  const colors = STAD_COLORS[stadId]

  const [openPanden, setOpenPanden] = useState(false)
  const [openTransacties, setOpenTransacties] = useState(false)
  const [openHuurcontracten, setOpenHuurcontracten] = useState(false)
  const [openGekoppeld, setOpenGekoppeld] = useState(true)

  const { deleted: deletedPanden,      deleteItem: deletePand }      = useDeletedItemsFase2(`deleted_panden_fase3_v2_${stadId}`)
  const { deleted: deletedTransacties, deleteItem: deleteTransactie } = useDeletedItemsFase2(`deleted_transacties_fase3_${stadId}`)

  // Panden in ontwikkeling,  aggregaat uit steden-data
  const stadData = steden.find((s) => s.naam === stadNaam)
  const pandenInOntwikkeling = (stadData?.gebieden.flatMap((g) =>
    g.pandenInOntwikkeling.map((p) => ({ ...p, gebiedNaam: g.naam }))
  ) ?? []).filter((p) =>
    !deletedPanden.has(p.id) &&
    !/afgerond|opgeleverd|in gebruik/i.test(p.verwachteOplevering)
  )

  // 3. Recente transacties,  gefilterd op stad
  const transactiesVoorStad = TRANSACTIES_DATA.filter((g) => g.stad === stadId)
  const totalTransacties = transactiesVoorStad.reduce((s, g) => s + g.transacties.length, 0)

  const subLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
  }

  // Prioriteitsgebieden Eindhoven,  gekoppeld aan aanbevolen actie
  const PRIORITEIT_GEBIED_IDS = ['centrum-eindhoven', 'airport-ehv']
  const prioriteitGebieden = stadNaam === 'Eindhoven'
    ? (stadData?.gebieden.filter((g) => PRIORITEIT_GEBIED_IDS.includes(g.id)) ?? [])
    : []
  const prioriteitContacten: (WarmContact & { gebiedNaam: string })[] = prioriteitGebieden.flatMap((g) =>
    g.warmeContacten.map((c) => ({ ...c, gebiedNaam: g.naam }))
  )
  const prioriteitLeads: (KansrijkeLead & { gebiedNaam: string })[] = prioriteitGebieden.flatMap((g) =>
    (g.kansrijkeLeads ?? []).map((l) => ({ ...l, gebiedNaam: g.naam }))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 2 · Panden in ontwikkeling,  uitklapbaar */}
      <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
        <button
          onClick={() => setOpenPanden((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={subLabel} onClick={(e) => e.stopPropagation()}>
            <EditableText storageKey={`fase3.${stadId}.sublabel.2`} defaultValue="2 · Panden in ontwikkeling" />
          </div>
          <span style={{ fontSize: 16, color: 'var(--c-subtle)', transform: openPanden ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
        </button>
        {openPanden && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px' }}>
        {pandenInOntwikkeling.length === 0 ? (
          <div style={{
            border: '1px dashed var(--c-border)', borderRadius: 10, padding: '20px 16px',
            fontSize: 12, color: 'var(--c-muted)', textAlign: 'center', fontStyle: 'italic',
          }}>
            {/* TODO: voeg pandenInOntwikkeling toe aan src/data/{stadNaam.toLowerCase()}.ts */}
            Nog geen panden in ontwikkeling geregistreerd voor {stadNaam}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pandenInOntwikkeling.map((pand) => {
              const badge = FASE_BADGE[pand.fase] ?? { label: pand.fase, bg: '#f1f5f9', text: '#475569' }
              return (
                <div
                  key={pand.id}
                  style={{
                    position: 'relative',
                    border: '1px solid var(--c-border)', borderRadius: 10,
                    padding: '14px 16px', background: 'var(--c-surface)',
                  }}
                >
                  <F2DeleteBtn onDelete={() => deletePand(pand.id)} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
                        <EditableText
                          storageKey={`fase3.${stadId}.pand.${pand.id}.naam`}
                          defaultValue={pand.naam}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
                        <EditableText
                          storageKey={`fase3.${stadId}.pand.${pand.id}.adres`}
                          defaultValue={pand.adres}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.text, border: '1px solid transparent' }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: colors.accentLight, color: colors.accent, border: `1px solid ${colors.accentBorder}` }}>
                        {pand.oppervlakte.toLocaleString('nl-NL')} m²
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--c-muted)', padding: '2px 8px', borderRadius: 6, background: '#f8f7f5', border: '1px solid var(--c-border)' }}>
                      Oplevering: <strong>{pand.verwachteOplevering}</strong>
                    </span>
                    {pand.ontwikkelaar && (
                      <span style={{ fontSize: 10, color: 'var(--c-muted)', padding: '2px 8px', borderRadius: 6, background: '#f8f7f5', border: '1px solid var(--c-border)' }}>
                        Ontwikkelaar: <strong>{pand.ontwikkelaar}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--c-subtle)', padding: '2px 8px', borderRadius: 6, background: '#f8f7f5', border: '1px solid var(--c-border)' }}>
                      {(pand as any).gebiedNaam}
                    </span>
                  </div>
                  <EditableText
                    storageKey={`fase3.${stadId}.pand.${pand.id}.toelichting`}
                    defaultValue={pand.toelichting}
                    tag="div"
                    multiline
                    style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}
                  />
                </div>
              )
            })}
          </div>
        )}
        </div>
        )}
      </div>

      {/* 3 · Recente transacties,  uitklapbaar */}
      <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
        <button
          onClick={() => setOpenTransacties((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <div style={subLabel}>
              <EditableText storageKey={`fase3.${stadId}.sublabel.3`} defaultValue="3 · Recente transacties" />
            </div>
            {transactiesVoorStad.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', marginBottom: 8 }}>
                {totalTransacties} · {transactiesVoorStad.length} gebieden
              </span>
            )}
          </div>
          <span style={{ fontSize: 16, color: 'var(--c-subtle)', transform: openTransacties ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
        </button>
        {openTransacties && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px' }}>
        {transactiesVoorStad.length === 0 ? (
          <div style={{
            border: '1px dashed var(--c-border)', borderRadius: 10, padding: '20px 16px',
            fontSize: 12, color: 'var(--c-muted)', textAlign: 'center', fontStyle: 'italic',
          }}>
            Nog geen transacties beschikbaar voor {stadNaam}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {transactiesVoorStad.map((gebied) => (
                <div key={gebied.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: colors.accent, flexShrink: 0 }} />
                    <EditableText storageKey={`transactie.${gebied.id}.naam`} defaultValue={gebied.naam} style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }} />
                    <BronTooltip bron={BRONNEN.transacties} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {gebied.transacties.map((t, i) => {
                      const tKey = `${gebied.id}.${i}`
                      if (deletedTransacties.has(tKey)) return null
                      return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          background: colors.accentLight,
                          border: `1px solid ${colors.accentBorder}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                        }}
                      >
                        <F2DeleteBtn onDelete={() => deleteTransactie(tKey)} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>
                          <EditableText storageKey={`transactie.${gebied.id}.${i}.adres`} defaultValue={t.adres} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 7px' }}>
                            <EditableText storageKey={`transactie.${gebied.id}.${i}.verkoper`} defaultValue={t.verkoper} />
                          </span>
                          <span style={{ fontSize: 11, color: colors.accent, fontWeight: 700 }}>→</span>
                          <span style={{ fontSize: 10, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 7px' }}>
                            <EditableText storageKey={`transactie.${gebied.id}.${i}.koper`} defaultValue={t.koper} />
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: colors.accent, color: '#fff' }}>
                            <EditableText storageKey={`transactie.${gebied.id}.${i}.koopsom`} defaultValue={t.koopsom} />
                          </span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                            <EditableText storageKey={`transactie.${gebied.id}.${i}.datum`} defaultValue={t.datum} />
                          </span>
                        </div>
                        <EditableText
                          storageKey={`transactie.${gebied.id}.${i}.context`}
                          defaultValue={t.context}
                          tag="div"
                          style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}
                        />
                      </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
        </div>
        )}
      </div>

      {/* 4 · Aflopende huurcontracten,  uitklapbaar */}
      <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
        <button
          onClick={() => setOpenHuurcontracten((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={subLabel} onClick={(e) => e.stopPropagation()}>
            <EditableText storageKey={`fase3.${stadId}.sublabel.4`} defaultValue="4 · Aflopende huurcontracten" />
          </div>
          <span style={{ fontSize: 16, color: 'var(--c-subtle)', transform: openHuurcontracten ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
        </button>
        {openHuurcontracten && (
          <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 12 }}>
              Huurcontracten met verwachte einddatum binnen 12–24 maanden. Bron: NVM/CBRE lease-data of directe navraag bij makelaars.
            </div>
            <EditableText
              storageKey={`fase3.${stadId}.huurcontracten.placeholder`}
              defaultValue={`Voeg hier aflopende huurcontracten in voor ${stadNaam}. Format: pandnaam · huurder · m² · einddatum contract.`}
              tag="div"
              multiline
              style={{ fontSize: 12, color: 'var(--c-subtle)', lineHeight: 1.6, padding: '12px 14px', background: '#f8f7f5', borderRadius: 8, border: '1px solid var(--c-border)' }}
            />
          </div>
        )}
      </div>

      {/* Aanbevolen actie,  Eindhoven */}
      {stadNaam === 'Eindhoven' && (
        <div style={{ border: '1px solid #bfdbfe', borderRadius: 12, overflow: 'hidden', background: '#eff6ff' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #bfdbfe', background: '#dbeafe' }}>
            <EditableText
              storageKey="fase3.eind.aanbevolen.titel"
              defaultValue="Aanbevolen actie: prioriteer Flight Forum & Centrum Eindhoven"
              style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'block' }}
            />
            <EditableText
              storageKey="fase3.eind.aanbevolen.sub"
              defaultValue="Bouw eerst referentieprojecten op toegankelijke locaties,  gebruik die als sleutel naar Strijp-S en High Tech Campus"
              style={{ fontSize: 11, color: '#3b82f6', marginTop: 2, display: 'block' }}
            />
          </div>
          <div style={{ padding: '14px 18px' }}>
            <EditableText
              storageKey="fase3.eind.aanbevolen.body"
              defaultValue="Prioriteer Flight Forum en Centrum Eindhoven als eerste acquisitiedoelen. Samen met het Carglass-project op Science Park vormen deze de referentiebase die nodig is om toegang te krijgen tot Strijp-S en High Tech Campus,  gebieden waar opdrachtgevers bewijs van track record verwachten vóórdat ze een gesprek aangaan. Zet Flight Forum en Centrum bewust in als portfolio-opbouw, niet alleen als omzetdoelstelling."
              tag="div"
              multiline
              style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.7 }}
            />
          </div>
        </div>
      )}

      {/* Gekoppelde kansen,  warme contacten + aflopende contracten in prioriteitsgebieden */}
      {stadNaam === 'Eindhoven' && (prioriteitContacten.length > 0 || prioriteitLeads.length > 0) && (
        <div style={{ border: '1px solid #bfdbfe', borderLeft: '4px solid #3b82f6', borderRadius: 12, overflow: 'hidden', background: '#f8faff' }}>

          {/* Header,  klikbaar voor uitklappen */}
          <button
            onClick={() => setOpenGekoppeld((o) => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 14px', background: '#eff6ff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6' }}>
                  <EditableText storageKey="fase3.eind.gekoppeld.overkoepelend" defaultValue="Gekoppeld aan aanbevolen actie" />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a', marginTop: 1 }}>
                  <EditableText
                    storageKey="fase3.eind.gekoppeld.header"
                    defaultValue={`${prioriteitContacten.length} warme contacten · ${prioriteitLeads.filter((l) => l.huurprijsPerM2).length} aflopende contracten,  Flight Forum & Centrum Eindhoven`}
                  />
                </div>
              </div>
            </div>
            <span style={{ fontSize: 16, color: '#3b82f6', transform: openGekoppeld ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
          </button>

          {openGekoppeld && (
            <>
              {/* Warme contacten */}
              {prioriteitContacten.length > 0 && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid #dbeafe', borderBottom: prioriteitLeads.length > 0 ? '1px solid #dbeafe' : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 10 }}>
                    <EditableText storageKey="fase3.eind.contacten.sublabel" defaultValue="Warme contacten,  in prioriteitsgebied" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {prioriteitContacten.map((c) => {
                      const isAirport = c.gebiedNaam.toLowerCase().includes('airport')
                      const gebiedBadge = isAirport
                        ? { label: 'Flight Forum',       bg: '#fff7ed', text: '#9a3412', border: '#fdba74' }
                        : { label: 'Centrum · Fellenoord', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
                      return (
                        <PrioriteitWarmContactCard
                          key={c.id}
                          contact={c}
                          gebiedBadge={gebiedBadge}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Aflopende contracten */}
              {prioriteitLeads.filter((l) => l.huurprijsPerM2).length > 0 && (
                <div style={{ padding: '14px 16px', borderTop: prioriteitContacten.length > 0 ? 'none' : '1px solid #dbeafe' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 10 }}>
                    <EditableText storageKey="fase3.eind.leads.sublabel" defaultValue="Aflopende contracten,  in prioriteitsgebied" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {prioriteitLeads.filter((l) => l.huurprijsPerM2).map((l) => {
                      const isAirport  = l.gebiedNaam.toLowerCase().includes('airport')
                      const gebiedBadge: GebiedBadge = isAirport
                        ? { label: 'Flight Forum',         bg: '#fff7ed', text: '#9a3412', border: '#fdba74' }
                        : { label: 'Centrum · Fellenoord', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
                      return <PrioriteitLeadCard key={l.id} lead={l} gebiedBadge={gebiedBadge} />
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ── FASE 4: Acquisitiegesprek ─────────────────────────────────────────────────

type F4Partij = 'eigenaar' | 'huurder'

const F4_PROTOCOL: Record<F2Product, Record<F4Partij, F2ProtocolInhoud>> = {
  'design-and-build': {
    eigenaar: {
      aanpak:  'Presenteer D&B als totaaloplossing bij herinrichting of renovatie. Nadruk op ontzorging: één aanspreekpunt van ontwerp tot oplevering, vaste prijs, bewezen proces. Verbindt de investering aan verhuurwaardeverhoging en energielabel C-renovatie.',
      kapstok: 'Heeft u plannen voor renovatie of herinrichting van uw pand in de komende 12–24 maanden?',
    },
    huurder: {
      aanpak:  'Luister naar het bedrijfsprofiel, de teamsamenstelling en de gewenste sfeer. Positioneer D&B als totaaloplossing waarbij Ditt van schets tot sleuteloverdracht verantwoordelijk is. Benadruk vaste prijs, bewezen planning en B Corp 89,5 als duurzaamheidsprofiel.',
      kapstok: 'Hoe ziet uw ideale werkplek eruit, en wat is uw tijdsplanning voor het betrekken van de nieuwe ruimte?',
    },
  },
  'fast-fit-out': {
    eigenaar: {
      aanpak:  'Verhoog bezettingsgraad door snel op te leveren. Geschikt voor objecten waar snelheid boven volledig maatwerk gaat. Beperkt risico, direct resultaat,  aantrekkelijk argument richting aankomende huurders met tijdsdruk.',
      kapstok: 'Hoe lang staat uw pand al leeg en hoe urgent is het om snel een huurder te huisvesten?',
    },
    huurder: {
      aanpak:  'Wanneer een huurder tijdsdruk heeft, is Fast Fit-Out het sterkste argument. Presenteer het concept als een vooraf gedefinieerd, bewezen pakket met vaste doorlooptijd. Geen langdurig ontwerptraject,  direct zekerheid over planning en prijs.',
      kapstok: 'Wanneer moet u de nieuwe ruimte uiterlijk betrekken en hoeveel speelruimte heeft u in de planning?',
    },
  },
  'detail-and-build': {
    eigenaar: {
      aanpak:  'Ideaal voor objecten waarbij de huurder of eigenaar al een architectenbureau heeft geselecteerd. Ditt treedt op als uitvoerend partner,  één aanspreekpunt voor de volledige bouwfase, zonder vertraging en binnen budget.',
      kapstok: 'Werkt de toekomstige gebruiker van uw pand al met een architect? Dan kan Ditt de uitvoering volledig overnemen.',
    },
    huurder: {
      aanpak:  'Wanneer de huurder al een architect in de arm heeft genomen, positioneer Ditt als de uitvoerende bouwpartner. Het ontwerp blijft volledig bij de architect; Ditt beheerst de volledige realisatie,  één aanspreekpunt, vaste prijs, betrouwbare oplevering.',
      kapstok: 'Werkt u al met een architect voor de inrichting? Dan kunnen wij de volledige uitvoering voor u overnemen.',
    },
  },
}

const F4_SLIDES: Record<F2Product, Record<F4Partij, { nr: number; omschrijving: string }[]>> = {
  'design-and-build': {
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 32, omschrijving: 'Design & Build Specialist,  van schets tot sleuteloverdracht' },
      { nr: 45, omschrijving: 'The Office Lifecycle,  van consultancy tot oplevering' },
      { nr: 20, omschrijving: 'B Corp 89,5,  duurzaamheid als verhuurargument' },
    ],
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 32, omschrijving: 'Design & Build,  van concept tot sleuteloverdracht' },
      { nr: 49, omschrijving: 'Storytelling,  kantoor als verlengstuk van uw merk' },
      { nr: 20, omschrijving: 'B Corp 89,5,  duurzame materialen standaard' },
      { nr: 45, omschrijving: 'The Office Lifecycle,  vroeg betrokken = meer impact' },
    ],
  },
  'fast-fit-out': {
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  bewezen concept, snelle realisatie' },
      { nr: 99, omschrijving: 'Planningsoverzicht,  tijdlijn en mijlpalen' },
      { nr: 20, omschrijving: 'B Corp 89,5,  duurzame materialen standaard' },
    ],
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 31, omschrijving: 'Fast Fit-Out,  vast concept, vaste prijs, vaste doorlooptijd' },
      { nr: 99, omschrijving: 'Planningsoverzicht,  geen verrassingen in de tijdlijn' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA, WELL, 65+ specialisten' },
    ],
  },
  'detail-and-build': {
    eigenaar: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 54, omschrijving: 'D&B organogram,  architect ontwerpt, Ditt bouwt' },
      { nr: 43, omschrijving: 'Samenwerking,  van dag 1 betrokken bij het team' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA, WELL, betrouwbare uitvoering' },
    ],
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 54, omschrijving: 'D&B organogram,  Ditt als bouwpartner naast uw architect' },
      { nr: 43, omschrijving: 'Samenwerking,  prettige partner bij complexe opgaven' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA, WELL, betrouwbare oplevering' },
    ],
  },
}

const F4_ELEVATOR_PITCH =
  'Ditt Officemakers is design & build specialist voor kantoorwerkomgevingen,  van schets tot sleuteloverdracht. ' +
  'Wij zijn B Corp gecertificeerd (score 89,5), werken met 65+ specialisten en zetten onze eigen AI-tool in om ' +
  'plattegronden snel in kaart te brengen. Of het nu gaat om een volledig Design & Build traject, een snelle ' +
  'Fast Fit-Out of Detail & Build met een externe architect,  wij zorgen dat het kantoor klaar is op tijd, ' +
  'binnen budget en met een resultaat waar mensen blij van worden.'

function Fase4AcquisitieContent({ stadNaam }: { stadNaam: string }) {
  const [product,    setProduct]    = useState<F2Product>('design-and-build')
  const [partijType, setPartijType] = useState<F4Partij>('eigenaar')
  const [m2Input,    setM2Input]    = useState<string>('')
  const [cfg,        setCfg]        = useState<StadConfig>({ ...DEFAULT_STAD_CONFIG })
  const [toonPitch,  setToonPitch]  = useState(false)

  const kanalen     = KANALEN_PER_STAD[stadNaam]
  const stadContext = kanalen?.[partijType]
  const protocol    = F4_PROTOCOL[product][partijType]
  const slides      = F4_SLIDES[product][partijType]
  const niveauOpties = ['Low', 'Mid', 'High']

  const m2 = parseFloat(m2Input.replace(',', '.')) || 0
  const calc = m2 > 0 ? calcBegroting(m2, cfg.type, cfg.fitout, cfg.furn, cfg.ident, cfg.mep) : null

  const subLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 10,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* 1 · Contactprotocol */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase4.${stadNaam.toLowerCase()}.sublabel.1`} defaultValue="1 · Contactprotocol,  eigenaren & huurders" /></div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, overflow: 'hidden' }}>

          {/* Header + partijtype selector */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-subtle)' }}>Contactprotocol</div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 3 }}>Gebouweigenaren &amp; huurders,  {stadNaam}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['eigenaar', 'huurder'] as const).map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPartijType(pt)}
                  style={{
                    padding: '5px 12px', fontSize: 12,
                    fontWeight: partijType === pt ? 700 : 500,
                    borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${partijType === pt ? '#1a1a1a' : 'var(--c-border)'}`,
                    background: partijType === pt ? '#1a1a1a' : 'transparent',
                    color: partijType === pt ? '#fff' : 'var(--c-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {pt === 'eigenaar' ? 'Eigenaar' : 'Huurder'}
                </button>
              ))}
            </div>
          </div>

          {/* Product tabs */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {F2_PRODUCTEN.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setProduct(id)}
                style={{
                  padding: '7px 14px', fontSize: 12,
                  fontWeight: product === id ? 700 : 500,
                  borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${product === id ? 'var(--c-coral)' : 'var(--c-border)'}`,
                  background: product === id ? 'var(--c-coral)' : 'var(--c-surface)',
                  color: product === id ? '#fff' : 'var(--c-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stad-specifieke context */}
          {stadContext && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border)', background: '#fdf8f5' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-coral)', marginBottom: 4 }}>
                {stadNaam},  marktcontext
              </div>
              <EditableText
                storageKey={`fase4.${stadNaam.toLowerCase()}.${partijType}.context`}
                defaultValue={stadContext.aanpak}
                tag="div" multiline
                style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Aanpak + kapstok + slides */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 6 }}><EditableText storageKey="fase2.proto.label.aanpak" defaultValue="Aanpak" /></div>
              <EditableText
                storageKey={`fase4.proto.${product}.${partijType}.aanpak`}
                defaultValue={protocol.aanpak}
                tag="div" multiline
                style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.7 }}
              />
            </div>
            <div style={{ padding: '12px 16px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #c4b5fd' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', marginBottom: 6 }}><EditableText storageKey="fase2.proto.label.kapstok" defaultValue="Kapstok-vraag" /></div>
              <EditableText
                storageKey={`fase4.proto.${product}.${partijType}.kapstok`}
                defaultValue={protocol.kapstok}
                tag="div" multiline
                style={{ fontSize: 12, color: '#6d28d9', lineHeight: 1.6, fontStyle: 'italic' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Aanbevolen slides */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 8 }}><EditableText storageKey="fase2.proto.label.slides" defaultValue="Aanbevolen slides" /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {slides.map((s) => (
                    <div key={s.nr} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, color: 'var(--c-muted)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--c-coral)', minWidth: 28, flexShrink: 0 }}>#{s.nr}</span>
                      <EditableText storageKey={`fase2.slides.${product}.${partijType}.${s.nr}`} defaultValue={s.omschrijving} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Elevator pitch */}
              <div>
                <button
                  onClick={() => setToonPitch(!toonPitch)}
                  style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Elevator pitch {toonPitch ? '▲' : '▼'}
                </button>
                {toonPitch ? (
                  <EditableText
                    storageKey="elevator_pitch"
                    defaultValue={F4_ELEVATOR_PITCH}
                    tag="p"
                    multiline
                    style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.7, margin: 0 }}
                  />
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--c-subtle)', margin: 0, fontStyle: 'italic' }}>
                    Klik om de standaard Ditt-pitch te tonen.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Begrotingsindicator */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase4.${stadNaam.toLowerCase()}.sublabel.2`} defaultValue="2 · Begrotingsindicator" /></div>
        <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--c-surface)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', background: '#faf9f7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>Begrotingsindicatie,  per gesprek</div>
            <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
              Kwaliteitsniveau × m² opgave · op basis van Begrotingssheet 2026 Premium
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* m² invoer */}
            <div style={{ padding: '14px 16px', background: '#f0f4ff', borderRadius: 10, border: '1px solid #c7d7fd' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b4ac8', marginBottom: 6 }}>
                Vul het aantal m² in waar het acquisitiegesprek over gaat voor een directe indicatie
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  min="0"
                  placeholder="bijv. 350"
                  value={m2Input}
                  onChange={(e) => setM2Input(e.target.value)}
                  style={{
                    fontSize: 20, fontWeight: 700, color: 'var(--c-text)',
                    width: 120, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid #c7d7fd', background: '#fff',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 14, color: 'var(--c-muted)', fontWeight: 600 }}>m²</span>
              </div>
            </div>

            {/* Kwaliteitsinstellingen */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '14px 16px', background: '#f8f7f5', borderRadius: 10, border: '1px solid var(--c-border)' }}>
              <div style={{ width: '100%', fontSize: 11, fontWeight: 700, color: 'var(--c-subtle)', marginBottom: -4 }}>Kwaliteitsniveau</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type project</span>
                <select style={selectStyle} value={cfg.type} onChange={(e) => setCfg((c) => ({ ...c, type: e.target.value }))}>
                  {['Open', 'Hybrid', 'Traditional'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fitout</span>
                <select style={selectStyle} value={cfg.fitout} onChange={(e) => setCfg((c) => ({ ...c, fitout: e.target.value }))}>
                  {niveauOpties.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Furniture</span>
                <select style={selectStyle} value={cfg.furn} onChange={(e) => setCfg((c) => ({ ...c, furn: e.target.value }))}>
                  {niveauOpties.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identity</span>
                <select style={selectStyle} value={cfg.ident} onChange={(e) => setCfg((c) => ({ ...c, ident: e.target.value }))}>
                  {niveauOpties.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Installaties (€/m²)</span>
                <select style={selectStyle} value={cfg.mep} onChange={(e) => setCfg((c) => ({ ...c, mep: Number(e.target.value) }))}>
                  {MEP_OPTIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>Prijs/m² (all-in)</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>
                  € {(FITOUT_TABLE[cfg.type][cfg.fitout] + FURNITURE_TABLE[cfg.furn] + IDENTITY_TABLE[cfg.ident] + cfg.mep).toLocaleString('nl-NL')}/m²
                </span>
              </div>
            </div>

            {/* Resultaat */}
            {calc ? (
              <>
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 10, padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Investering ({m2.toLocaleString('nl-NL')} m²)</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{fmEuro(calc.total)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Inkoopprijs</div>
                    <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.85 }}>{fmEuro(calc.inkoop)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Marge</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{(calc.marge * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(calc.details).map(([naam, d]) => (
                    <div key={naam} style={{ fontSize: 10, color: 'var(--c-muted)', background: '#f8f7f5', borderRadius: 6, padding: '3px 8px', border: '1px solid var(--c-border)' }}>
                      {naam} · € {Math.round(d.p)}/m²
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--c-subtle)' }}>
                  Prijzen en marges op basis van Begrotingssheet 2026 Premium (intern). Bouwplaatsinrichting 4% inbegrepen. Installaties marge 10%, overige categorieën 35%. PM/ontwerp en overheads niet meegenomen.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--c-subtle)', fontStyle: 'italic', padding: '10px 0' }}>
                Vul een m²-getal in om de begrotingsindicatie te berekenen.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

// ── FASE 2: Netwerk opbouwen ──────────────────────────────────────────────────

function Fase2NetwerkContent({ stadNaam }: { stadNaam: string }) {
  const { allSteden: steden } = useAllSteden()
  const stadId = stadNaam.toLowerCase() as 'eindhoven' | 'rotterdam'
  const [product,    setProduct]    = useState<F2Product>('design-and-build')
  const [partijType, setPartijType] = useState<F2Partij>('makelaar')

  const { deleted: deletedWc, deleteItem: deleteWc } = useDeletedItemsFase2(`deleted_wc_fase2_${stadId}`)
  const { contacts: localContacts, addContact, removeContact } = useLocalContacts(stadId)
  const [showNieuwForm, setShowNieuwForm] = useState(false)

  const stad = steden.find((s) => s.naam === stadNaam)
  const alleWarmeContacten: WarmContact[] = (() => {
    const raw = stad?.gebieden.flatMap((g) => g.warmeContacten) ?? []
    const seen = new Set<string>()
    return raw.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
  })().filter((c) => !deletedWc.has(c.id))

  const kanalen    = KANALEN_PER_STAD[stadNaam]
  const stadContext = kanalen?.[partijType]

  const protocol = F2_PROTOCOL[product][partijType]
  const slides   = F2_SLIDES[product][partijType]

  const inzichtFilter = (inzicht: VeldonderzoekInzicht) =>
    !inzicht.stad || inzicht.stad === stadId || inzicht.stad === 'both'

  const veldThemas = VELDONDERZOEK_THEMAS.filter((t) => FASE2_VELD_THEMAS.includes(t.id))

  const subLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 10,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* 1 · Contactprotocol */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase2.${stadId}.sublabel.1`} defaultValue="1 · Contactprotocol,  aanpak per partijtype" /></div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, overflow: 'hidden' }}>

          {/* Header + partijtype selector */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-subtle)' }}><EditableText storageKey="fase2.proto.header.titel" defaultValue="Contactprotocol" /></div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 3 }}><EditableText storageKey={`fase2.proto.header.sub.${stadNaam.toLowerCase()}`} defaultValue={`Makelaars & gebouweigenaren,  ${stadNaam}`} /></div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['makelaar', 'eigenaar'] as const).map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPartijType(pt)}
                  style={{
                    padding: '5px 12px', fontSize: 12,
                    fontWeight: partijType === pt ? 700 : 500,
                    borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${partijType === pt ? '#1a1a1a' : 'var(--c-border)'}`,
                    background: partijType === pt ? '#1a1a1a' : 'transparent',
                    color: partijType === pt ? '#fff' : 'var(--c-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {pt === 'makelaar' ? 'Makelaar' : 'Eigenaar'}
                </button>
              ))}
            </div>
          </div>

          {/* Product tabs */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {F2_PRODUCTEN.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setProduct(id)}
                style={{
                  padding: '7px 14px', fontSize: 12,
                  fontWeight: product === id ? 700 : 500,
                  borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${product === id ? 'var(--c-coral)' : 'var(--c-border)'}`,
                  background: product === id ? 'var(--c-coral)' : 'var(--c-surface)',
                  color: product === id ? '#fff' : 'var(--c-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stad-specifieke context */}
          {stadContext && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border)', background: '#fdf8f5' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-coral)', marginBottom: 4 }}>
                {stadNaam},  marktcontext
              </div>
              <EditableText
                storageKey={`fase2.${stadNaam.toLowerCase()}.${partijType}.context`}
                defaultValue={stadContext.aanpak}
                tag="div" multiline
                style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Generieke aanpak + kapstok */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 6 }}><EditableText storageKey="fase2.proto.label.aanpak" defaultValue="Aanpak" /></div>
              <EditableText
                storageKey={`fase2.proto.${product}.${partijType}.aanpak`}
                defaultValue={protocol.aanpak}
                tag="div" multiline
                style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.7 }}
              />
            </div>
            <div style={{ padding: '12px 16px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #c4b5fd' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', marginBottom: 6 }}><EditableText storageKey="fase2.proto.label.kapstok" defaultValue="Kapstok-vraag" /></div>
              <EditableText
                storageKey={`fase2.proto.${product}.${partijType}.kapstok`}
                defaultValue={protocol.kapstok}
                tag="div" multiline
                style={{ fontSize: 12, color: '#6d28d9', lineHeight: 1.6, fontStyle: 'italic' }}
              />
            </div>

            {/* Aanbevolen slides */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 8 }}><EditableText storageKey="fase2.proto.label.slides" defaultValue="Aanbevolen slides" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {slides.map((s) => (
                  <div key={s.nr} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, color: 'var(--c-muted)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--c-coral)', minWidth: 28, flexShrink: 0 }}>#{s.nr}</span>
                    <EditableText storageKey={`fase2.slides.${product}.${partijType}.${s.nr}`} defaultValue={s.omschrijving} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Veldonderzoek,  makelaarsrelaties & acquisitie */}
      <div>
        <div style={subLabel}><EditableText storageKey={`fase2.${stadId}.sublabel.2`} defaultValue="2 · Veldonderzoek,  makelaarsrelaties, acquisitie & toetreding" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {veldThemas.map((thema) => {
            const gefilterd = thema.inzichten.filter(inzichtFilter)
            if (gefilterd.length === 0) return null
            return (
              <div key={thema.id} style={{ border: '1px solid var(--c-border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f8f7f5', borderBottom: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>{thema.titel}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>{thema.beschrijving}</div>
                </div>
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {gefilterd.map((inzicht, i) => {
                    const badge = inzicht.stad ? VELDONDERZOEK_STAD_BADGE[inzicht.stad] : null
                    return (
                      <div key={i} style={{ background: '#fafaf9', border: '1px solid var(--c-border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {badge && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, alignSelf: 'flex-start' }}>
                            {badge.label}
                          </span>
                        )}
                        {inzicht.citaat && (
                          <blockquote style={{ margin: 0, padding: '6px 10px', borderLeft: '3px solid #e2e8f0', background: '#fff', borderRadius: '0 6px 6px 0' }}>
                            <div style={{ fontSize: 11, color: 'var(--c-text)', lineHeight: 1.6, fontStyle: 'italic' }}>{inzicht.citaat}</div>
                          </blockquote>
                        )}
                        {inzicht.toelichting && (
                          <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}>{inzicht.toelichting}</div>
                        )}
                        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--c-border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>{inzicht.persoon}</div>
                          <div style={{ fontSize: 10, color: 'var(--c-muted)' }}>{inzicht.organisatie}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aanbevolen actie,  makelaars Eindhoven */}
      {stadNaam === 'Eindhoven' && (
        <div style={{ border: '1px solid #bfdbfe', borderRadius: 12, overflow: 'hidden', background: '#eff6ff' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #bfdbfe', background: '#dbeafe' }}>
            <EditableText
              storageKey="fase2.eind.makelaars.titel"
              defaultValue="Aanbevolen actie: oriënterend gesprek inplannen"
              style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'block' }}
            />
            <EditableText
              storageKey="fase2.eind.makelaars.sub"
              defaultValue="Vier lokale bedrijfsmakelaars,  direct benaderen voor relatieopbouw"
              style={{ fontSize: 11, color: '#3b82f6', marginTop: 2, display: 'block' }}
            />
          </div>
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[
              {
                id: 'vs',
                naam: 'Verschuuren & Schreppers',
                sub: 'Bedrijfsmakelaars,  Eindhoven',
                beschrijving: 'Dominante lokale makelaar in Eindhoven. Al gesproken in ontwerpfase (Dirk Verberne, 6 mrt 2026). Call gepland. Status: warm, relatie in opbouw.',
                email: 'info@verschuurenschreppers.nl',
                website: 'verschuurenschreppers.nl',
              },
              {
                id: 'bf',
                naam: 'Bossers & Fitters',
                sub: 'Bedrijfshuisvesting,  Eindhoven',
                beschrijving: 'NVM-kantoor in Eindhoven. Persoonlijke aanpak, actief in verhuur en verkoop van kantoor- en bedrijfsruimte. Vergelijkbaar profiel als Schaub & Partners in Rotterdam.',
                email: 'info@bossersfitters.nl',
                website: 'bossersfitters.nl',
              },
              {
                id: 'kb',
                naam: 'Kolsteren Bedrijfshuisvesting',
                sub: 'Bedrijfsmakelaardij,  Eindhoven',
                beschrijving: 'Meer dan 25 jaar actief in regio Eindhoven. Bewust klein en onafhankelijk team met accent op commercieel vastgoed.',
                email: 'info@kolsterenbedrijfshuisvesting.nl',
                website: 'kolsterenbedrijfshuisvesting.nl',
              },
              {
                id: 'avh',
                naam: 'Adriaan van den Heuvel',
                sub: 'Bedrijfsmakelaardij,  Eindhoven & Helmond',
                beschrijving: 'Regionaal kantoor voor Eindhoven en Helmond. Breed pakket commercieel vastgoed, actief in aan- en verhuur.',
                email: 'info@heuvel.nl',
                website: 'heuvel.nl',
              },
            ].map((m) => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 10, padding: '14px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <EditableText storageKey={`fase2.eind.mkl.${m.id}.naam`} defaultValue={m.naam} style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.3 }} />
                <EditableText storageKey={`fase2.eind.mkl.${m.id}.sub`} defaultValue={m.sub} style={{ fontSize: 10, color: 'var(--c-subtle)', lineHeight: 1.3 }} />
                <EditableText storageKey={`fase2.eind.mkl.${m.id}.beschr`} defaultValue={m.beschrijving} tag="div" multiline style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6, flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <a
                    href={`mailto:${getEditableText(`fase2.eind.mkl.${m.id}.email`, m.email)}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: '#1e40af', textDecoration: 'none', flexShrink: 0 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
                    </svg>
                  </a>
                  <a href={`https://${getEditableText(`fase2.eind.mkl.${m.id}.website`, m.website)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                    <EditableText storageKey={`fase2.eind.mkl.${m.id}.website`} defaultValue={m.website} style={{ fontSize: 11, color: '#3b82f6' }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 · Warme ingangen */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={subLabel}>
            <EditableText storageKey={`fase2.${stadId}.sublabel.3`} defaultValue={`3 · Warme ingangen,  ${alleWarmeContacten.length + localContacts.length} contact${(alleWarmeContacten.length + localContacts.length) !== 1 ? 'en' : ''} in beeld`} />
          </div>
          <button
            onClick={() => setShowNieuwForm((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
              border: '1px solid #fcd34d', background: showNieuwForm ? '#d97706' : '#fffbeb',
              color: showNieuwForm ? '#fff' : '#92400e', transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{showNieuwForm ? '×' : '+'}</span>
            {showNieuwForm ? 'Sluiten' : 'Nieuw contact'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {alleWarmeContacten.map((c) => (
            <Fase2WarmContactCard key={c.id} contact={c} onDelete={() => deleteWc(c.id)} />
          ))}
          {localContacts.map((c) => (
            <Fase2WarmContactCard key={c.id} contact={c} onDelete={() => removeContact(c.id)} />
          ))}
          {showNieuwForm && (
            <NieuwContactForm
              onSave={(c) => { addContact(c); setShowNieuwForm(false) }}
              onCancel={() => setShowNieuwForm(false)}
            />
          )}
        </div>
        {alleWarmeContacten.length === 0 && localContacts.length === 0 && !showNieuwForm && (
          <div style={{ fontSize: 12, color: 'var(--c-subtle)', fontStyle: 'italic' }}>
            Geen warme contacten geregistreerd voor {stadNaam}.
          </div>
        )}
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const FASES = [
  {
    nr: 1,
    titel: 'Oriëntatie',
    vraag: 'Wat moet ik weten voordat ik contact leg?',
    kleur: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    textColor: '#1e40af',
    headerBg: '#dbeafe',
    Icon: Compass,
  },
  {
    nr: 2,
    titel: 'Netwerk opbouwen',
    vraag: 'Met wie moet ik in contact komen en hoe?',
    kleur: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    textColor: '#6d28d9',
    headerBg: '#ede9fe',
    Icon: Users,
  },
  {
    nr: 3,
    titel: 'Actief prospecting',
    vraag: 'Hoe identificeer ik de juiste doelpartijen?',
    kleur: '#f59e0b',
    bg: '#fffbeb',
    border: '#fcd34d',
    textColor: '#92400e',
    headerBg: '#fef3c7',
    Icon: Target,
  },
  {
    nr: 4,
    titel: 'Acquisitiegesprek',
    vraag: 'Hoe maak ik het gesprek concreet en win ik de opdracht?',
    kleur: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    textColor: '#166534',
    headerBg: '#dcfce7',
    Icon: Handshake,
  },
]

function ActieOverzichtView() {
  const { customSteden } = useAllSteden()
  const marktcapSteden = MARKTCAP_STEDEN.filter((s) => s.naam !== 'Amsterdam')
  const customAlsFunnel: MarktCapStad[] = customSteden.map((s) => ({
    naam: s.naam, leegstandM2: 0, partijen: 0, penetratie: 0, dittM2: 0, defaultPrijs: 0, concurrenten: '',
  }))
  const beschikbareSteden = [...marktcapSteden, ...customAlsFunnel]
  const [geselecteerdeStad, setGeselecteerdeStad] = useState<string>(beschikbareSteden[0]?.naam ?? '')
  const { isEditMode } = useEditMode()

  const [drempel, setDrempel] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(beschikbareSteden.map((s) => {
      try {
        const saved = localStorage.getItem(`drempel_checks_${s.naam}`)
        return [s.naam, saved ? JSON.parse(saved) : DREMPEL_ITEMS.map(() => false)]
      } catch { return [s.naam, DREMPEL_ITEMS.map(() => false)] }
    }))
  )
  const [openDrempel, setOpenDrempel] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(beschikbareSteden.map((s) => [s.naam, false]))
  )
  const [actieveFase, setActieveFase] = useState<Record<string, number>>(() =>
    Object.fromEntries(beschikbareSteden.map((s) => [s.naam, 1]))
  )
  const [deletedDrempel, setDeletedDrempel] = useState<Record<string, Set<number>>>(() =>
    Object.fromEntries(beschikbareSteden.map((s) => {
      try { return [s.naam, new Set<number>(JSON.parse(localStorage.getItem(`deleted_drempel_${s.naam}`) ?? '[]'))] }
      catch { return [s.naam, new Set<number>()] }
    }))
  )

  function toggleDrempel(stadNaam: string, idx: number) {
    setDrempel((prev) => {
      const next = { ...prev, [stadNaam]: prev[stadNaam].map((v, i) => (i === idx ? !v : v)) }
      localStorage.setItem(`drempel_checks_${stadNaam}`, JSON.stringify(next[stadNaam]))
      return next
    })
  }

  function deleteDrempelItem(stadNaam: string, idx: number) {
    setDeletedDrempel((prev) => {
      const next = new Set(prev[stadNaam])
      next.add(idx)
      localStorage.setItem(`deleted_drempel_${stadNaam}`, JSON.stringify([...next]))
      return { ...prev, [stadNaam]: next }
    })
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--c-subtle)', marginBottom: 8,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0 }}>
            Acquisitie-instrument BD
          </h1>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: '4px 0 0' }}>
            Vier-fase trechter per stad · BD-status · drempelcriteria
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {beschikbareSteden.map((s) => {
            const active = s.naam === geselecteerdeStad
            return (
              <button
                key={s.naam}
                onClick={() => setGeselecteerdeStad(s.naam)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: active ? 'var(--c-coral)' : 'var(--c-surface)',
                  color: active ? '#fff' : 'var(--c-muted)',
                  border: `1px solid ${active ? 'var(--c-coral)' : 'var(--c-border)'}`,
                  boxShadow: active ? '0 2px 8px rgba(255,127,80,0.3)' : 'none',
                }}
              >
                {s.naam}
              </button>
            )
          })}
        </div>
      </div>

      {beschikbareSteden.filter((s) => s.naam === geselecteerdeStad).map((stad) => {
        const drempelLijst = drempel[stad.naam] ?? DREMPEL_ITEMS.map(() => false)
        const aantalKlaar  = drempelLijst.filter(Boolean).length
        const klaarVoorAcquisitie = aantalKlaar >= 4
        const huidigeFaseNr = actieveFase[stad.naam] ?? 1
        const huidigeFase   = FASES[huidigeFaseNr - 1]

        return (
          <div key={stad.naam} style={{ border: '1px solid var(--c-border)', borderRadius: 14, overflow: 'hidden', background: 'var(--c-surface)' }}>

            {/* ── Stad header ── */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fafaf9' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>{stad.naam}</div>
                <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
                  {stad.dittM2 > 0 ? `${stad.dittM2.toLocaleString('nl-NL')} m² doelregio · ` : ''}{aantalKlaar}/{DREMPEL_ITEMS.length} drempelcriteria ·{' '}
                  <span style={{ fontWeight: 700, color: klaarVoorAcquisitie ? '#16a34a' : '#d97706' }}>
                    {klaarVoorAcquisitie ? 'Klaar voor acquisitie' : 'Nog niet startklaar'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Acquisitietrechter ── */}
              <div>
                <div style={labelStyle}><EditableText storageKey="trechter.label" defaultValue="Acquisitietrechter,  4 fases" /></div>

                {/* ── Horizontale fase-stepper ── */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                  {FASES.map((fase, i) => {
                    const isActive  = fase.nr === huidigeFaseNr
                    const isDone    = fase.nr < huidigeFaseNr
                    const isLast    = i === FASES.length - 1
                    const FaseIcon  = fase.Icon
                    return (
                      <div key={fase.nr} style={{ display: 'contents' }}>
                        <button
                          onClick={() => setActieveFase((prev) => ({ ...prev, [stad.naam]: fase.nr }))}
                          title={fase.titel}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px',
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.15s',
                            background: isActive ? fase.kleur : isDone ? fase.kleur + '22' : 'transparent',
                            border: `2px solid ${isActive ? fase.kleur : isDone ? fase.kleur + '88' : '#d1d5db'}`,
                          }}>
                            {isDone ? (
                              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                                <path d="M1.5 5L5 8.5L11.5 1.5" stroke={fase.kleur} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <FaseIcon size={15} color={isActive ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
                            )}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap',
                            color: isActive ? fase.textColor : isDone ? fase.kleur : '#9ca3af',
                          }}>
                            <EditableText storageKey={`fase.${fase.nr}.titel`} defaultValue={fase.titel} />
                          </span>
                        </button>
                        {!isLast && (
                          <div style={{
                            flex: 1, height: 2, marginBottom: 18, marginLeft: 2, marginRight: 2,
                            background: fase.nr < huidigeFaseNr ? fase.kleur + '66' : '#e5e7eb',
                          }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* ── Actieve fase,  fullwidth ── */}
                <div style={{ border: `1px solid ${huidigeFase.border}`, borderRadius: 12, overflow: 'hidden' }}>

                  {/* Fase-header */}
                  <div style={{
                    padding: '14px 20px', background: huidigeFase.headerBg,
                    borderBottom: `1px solid ${huidigeFase.border}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: huidigeFase.kleur, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <huidigeFase.Icon size={18} color="white" strokeWidth={2.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: huidigeFase.textColor, lineHeight: 1.2 }}>
                        Fase {huidigeFase.nr} · <EditableText key={`fase.${huidigeFase.nr}.titel`} storageKey={`fase.${huidigeFase.nr}.titel`} defaultValue={huidigeFase.titel} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>
                        <EditableText key={`fase.${huidigeFase.nr}.vraag`} storageKey={`fase.${huidigeFase.nr}.vraag`} defaultValue={huidigeFase.vraag} />
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                      background: huidigeFase.kleur + '22',
                      color: huidigeFase.textColor,
                      border: `1px solid ${huidigeFase.border}`,
                    }}>
                      {huidigeFaseNr}/{FASES.length}
                    </span>
                  </div>

                  {/* Fase-inhoud */}
                  <div style={{ background: huidigeFase.bg, padding: huidigeFase.nr === 1 ? '20px' : '20px 20px 4px' }}>
                    {huidigeFase.nr === 1 ? (
                      <Fase1OrientatieContent stadNaam={stad.naam} />
                    ) : huidigeFase.nr === 2 ? (
                      <Fase2NetwerkContent stadNaam={stad.naam} />
                    ) : huidigeFase.nr === 3 ? (
                      <Fase3ProspectingContent stadNaam={stad.naam} />
                    ) : huidigeFase.nr === 4 ? (
                      <Fase4AcquisitieContent stadNaam={stad.naam} />
                    ) : (
                      <EditableText
                        storageKey={`actie.${stad.naam.toLowerCase()}.fase${huidigeFase.nr}.inhoud`}
                        defaultValue="Inhoud volgt in volgende prompt."
                        tag="div"
                        style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.6, fontStyle: 'italic' }}
                      />
                    )}
                  </div>

                  {/* Navigatie */}
                  <div style={{
                    padding: '14px 20px', background: huidigeFase.bg,
                    borderTop: `1px solid ${huidigeFase.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    {huidigeFaseNr > 1 ? (
                      <button
                        onClick={() => setActieveFase((prev) => ({ ...prev, [stad.naam]: huidigeFaseNr - 1 }))}
                        style={{
                          fontSize: 12, color: 'var(--c-subtle)', background: 'none',
                          border: 'none', cursor: 'pointer', padding: '6px 0',
                        }}
                      >
                        ← Vorige fase
                      </button>
                    ) : <div />}

                    {huidigeFaseNr < FASES.length ? (
                      <button
                        onClick={() => setActieveFase((prev) => ({ ...prev, [stad.naam]: huidigeFaseNr + 1 }))}
                        style={{
                          fontSize: 12, fontWeight: 700, color: 'white',
                          background: huidigeFase.kleur, border: 'none',
                          borderRadius: 8, cursor: 'pointer', padding: '8px 18px',
                        }}
                      >
                        Volgende fase →
                      </button>
                    ) : (
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: huidigeFase.textColor,
                        padding: '8px 16px', background: huidigeFase.headerBg,
                        border: `1px solid ${huidigeFase.border}`, borderRadius: 8,
                      }}>
                        Acquisitiegesprek afgerond ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Drempelcriteria ── */}
              {(() => {
                const stadDeleted = deletedDrempel[stad.naam] ?? new Set<number>()
                const visibleItems = DREMPEL_ITEMS.map((item, idx) => ({ item, idx })).filter(({ idx }) => !stadDeleted.has(idx))
                const aantalKlaarVisible = visibleItems.filter(({ idx }) => drempelLijst[idx]).length
                return (
                  <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => setOpenDrempel((prev) => ({ ...prev, [stad.naam]: !prev[stad.naam] }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ ...labelStyle, margin: 0 }}><EditableText storageKey="drempel.sectie.titel" defaultValue="Drempelcriteria,  naar actief prospecting" /></span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 8, background: aantalKlaarVisible === visibleItems.length ? '#dcfce7' : '#fef9c3', color: aantalKlaarVisible === visibleItems.length ? '#16a34a' : '#854d0e' }}>
                          {aantalKlaarVisible}/{visibleItems.length}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--c-subtle)', transform: openDrempel[stad.naam] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>↓</span>
                    </button>
                    {openDrempel[stad.naam] && (
                      <div style={{ borderTop: '1px solid var(--c-border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {visibleItems.map(({ item, idx }) => {
                          const checked = drempelLijst[idx]
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Checkbox checked={checked} onChange={() => toggleDrempel(stad.naam, idx)} />
                              <span style={{ flex: 1, fontSize: 12, color: checked ? '#16a34a' : 'var(--c-text)', textDecoration: checked ? 'line-through' : 'none', cursor: 'pointer' }} onClick={() => toggleDrempel(stad.naam, idx)}>
                                <EditableText storageKey={`drempel.item.${idx}`} defaultValue={item} />
                              </span>
                              {isEditMode && (
                                <button onClick={() => deleteDrempelItem(stad.naam, idx)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#d1d5db', padding: '0 2px' }} title="Verwijder">✕</button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── RecenteImportsPanel ───────────────────────────────────────────────────────

function RecenteImportsPanel() {
  const [items, setItems] = useState<ImportedItem[]>(() => getImportedItems())

  useEffect(() => {
    // Local event (same tab)
    const handler = () => setItems(getImportedItems())
    window.addEventListener('document:import', handler)

    // Supabase realtime (other tabs/users)
    const channel = supabase
      .channel('document-imports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edits' }, (payload) => {
        const key = (payload.new as Record<string, string>)?.key ?? (payload.old as Record<string, string>)?.key
        if (key === 'document_imports') handler()
      })
      .subscribe()

    // Initial fetch from Supabase (in case localStorage is stale)
    supabase.from('edits').select('value').eq('key', 'document_imports').maybeSingle().then(({ data }) => {
      if (data?.value) {
        try {
          const remote = JSON.parse(data.value) as ImportedItem[]
          setItems(remote)
          localStorage.setItem('document_imports', data.value)
        } catch { /* ignore */ }
      }
    })

    return () => {
      window.removeEventListener('document:import', handler)
      supabase.removeChannel(channel)
    }
  }, [])

  if (items.length === 0) return null

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 18px',
          background: 'var(--c-surface)',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
            Geïmporteerde items
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 1 }}>
            Aangemaakt via document drag &amp; drop,  {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          Sleep bestand op dit scherm om toe te voegen
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              padding: '10px 18px',
              borderBottom: i < items.length - 1 ? '1px solid var(--c-border)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--c-surface)',
            }}
          >
            {/* Type badge */}
            <div
              style={{
                flexShrink: 0,
                padding: '3px 8px',
                borderRadius: 6,
                background: item.typeColor + '18',
                border: `1px solid ${item.typeColor}40`,
                color: item.typeColor,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {item.typeLabel}
            </div>

            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--c-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 1, display: 'flex', gap: 8 }}>
                {item.stad && <span>{item.stad}</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {item.sourceFile}
                </span>
              </div>
            </div>

            {/* Date */}
            <div style={{ fontSize: 11, color: 'var(--c-subtle)', flexShrink: 0 }}>
              {fmt(item.createdAt)}
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteImportedItem(item.id)}
              title="Verwijderen"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: 'var(--c-subtle)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 4px',
                borderRadius: 4,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── StadOverzichtView ─────────────────────────────────────────────────────────

export default function StadOverzichtView() {
  const { allSteden, customSteden, removeStad } = useAllSteden()
  const { viewMode } = useViewMode()
  const { isEditMode } = useEditMode()
  const [partijOverrides, setPartijOverrides] = useState<Record<string, number>>(() =>
    Object.fromEntries(MARKTCAP_STEDEN.map((s) => [s.naam, s.partijen]))
  )
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hidden_panels') ?? '[]')) } catch { return new Set() }
  })
  function hidePanel(id: string) {
    setHiddenPanels((prev) => {
      const next = new Set(prev)
      next.add(id)
      const json = JSON.stringify([...next])
      localStorage.setItem('hidden_panels', json)
      queueChange('hidden_panels', json)
      return next
    })
  }

  if (viewMode === 'actie') return <ActieOverzichtView />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--c-text)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Stadsoverzicht
        </h1>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: '4px 0 0' }}>
          Marktindicatoren per stad,  JLL Office Q4 2025 · Vastgoeddata.nl april 2026
        </p>
      </div>

      {/* Eindhoven + Rotterdam altijd naast elkaar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {allSteden.filter(s => !customSteden.find(c => c.id === s.id)).map((stad) => (
          <StadPanel key={stad.id} stad={stad} />
        ))}
      </div>

      {/* Custom steden per rij van 2, met balanskolom als oneven */}
      {customSteden.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {customSteden.map((stad) => (
            <StadPanel key={stad.id} stad={stad} onDelete={() => removeStad(stad.id)} />
          ))}
          {customSteden.length % 2 !== 0 && (
            <div
              style={{
                border: '1px dashed var(--c-border)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 220,
                opacity: 0.45,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--c-subtle)', letterSpacing: '0.04em' }}>
                Volgende stad
              </span>
            </div>
          )}
        </div>
      )}

      {/* Geïmporteerde items */}
      <RecenteImportsPanel />

      {/* Testvalidatie */}
      <PanelWrapper hidden={hiddenPanels.has('testvalidatie')} onHide={() => hidePanel('testvalidatie')} editMode={isEditMode}><TestvalidatiePanel /></PanelWrapper>

      {/* Omgevingskenmerken Eindhoven */}
      <PanelWrapper hidden={hiddenPanels.has('omgeving-eindhoven')} onHide={() => hidePanel('omgeving-eindhoven')} editMode={isEditMode}><OmgevingskenmerkenPanel /></PanelWrapper>

      {/* Omgevingskenmerken Rotterdam */}
      <PanelWrapper hidden={hiddenPanels.has('omgeving-rotterdam')} onHide={() => hidePanel('omgeving-rotterdam')} editMode={isEditMode}><RotterdamOmgevingskenmerkenPanel /></PanelWrapper>

      {/* Rotterdam kantorenstrategie MRDH */}
      <PanelWrapper hidden={hiddenPanels.has('strategie-rotterdam')} onHide={() => hidePanel('strategie-rotterdam')} editMode={isEditMode}><RotterdamKantorenstrategiePanel /></PanelWrapper>

      {/* Rotterdam leegstand per pand */}
      <PanelWrapper hidden={hiddenPanels.has('leegstand-rotterdam')} onHide={() => hidePanel('leegstand-rotterdam')} editMode={isEditMode}><RotterdamLeegstandPanel /></PanelWrapper>

      {/* Recente transacties */}
      <PanelWrapper hidden={hiddenPanels.has('recente-transacties')} onHide={() => hidePanel('recente-transacties')} editMode={isEditMode}><RecenteTransactiesPanel /></PanelWrapper>

      {/* Live marktnieuws feed */}
      <div style={{ border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>Live marktnieuws</div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>PropertyNL · Rotterdam &amp; Eindhoven · elke 30 min bijgewerkt</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, padding: '16px', borderRight: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rotterdam</div>
            <NieuwsFeed stadFilter="rotterdam" />
          </div>
          <div style={{ flex: 1, padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Eindhoven</div>
            <NieuwsFeed stadFilter="eindhoven" />
          </div>
        </div>
      </div>

      {/* Veldonderzoek trends & inzichten */}
      <VeldonderzoekPanel />

      {/* Market cap */}
      <MarketCapPanel partijOverrides={partijOverrides} setPartijOverrides={setPartijOverrides} />

      {/* Begroting doelregio */}
      <BegrotingsDoelregioPanel partijOverrides={partijOverrides} />

      {/* Source note */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--c-subtle)',
          padding: '10px 14px',
          background: '#f8f7f5',
          borderRadius: 8,
          border: '1px solid var(--c-border)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--c-muted)' }}>Referenties</strong>
        <br />
        Jones Lang LaSalle IP, Inc. (2026). <em>Office market: Rotterdam &amp; Eindhoven Q4 2025</em>. JLL Research.
        <br />
        Vastgoeddata.nl. (2026, 29 april). <em>Gebiedsanalyses kantoormarkten</em> [Dataset]. Vastgoeddata.nl.
        <br />
        Vastgoeddata.nl. (2026, 29 april). <em>Transactiedatabase kantoormarkt 2024–2026</em> [Dataset]. Vastgoeddata.nl.
        <br />
        Vastgoeddata.nl. (2026). <em>Transactiemonitor kantoormarkt 2025</em> [Dataset]. Vastgoeddata.nl.
        <br />
        Vastgoeddata.nl. (2026). <em>Transactiedatabase vastgoed 2024–2026</em> [Dataset]. Vastgoeddata.nl.
        <br />
        Veldonderzoek Ditt. Officemakers (2026). <em>Interne interviews (Bijlage 6), vastgoedbeslissers (Bijlage 7) en makelaarsinterviews doelregio's (Bijlage 9)</em>. Verantwoordingsverslag Ditt. Officemakers.
        <br /><br />
        <span style={{ color: 'var(--c-subtle)' }}>
          Hover over het <strong>ⓘ</strong>-icoon naast een waarde voor de specifieke bron.
        </span>
      </div>
    </div>
  )
}
