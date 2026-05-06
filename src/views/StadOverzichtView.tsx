import { useState } from 'react'
import steden from '../data/steden'
import type { Stad, Gebied, GebiedStatus } from '../data/types'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import BronTooltip from '../components/BronTooltip'
import EditableText from '../components/EditableText'

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
}

// ── JLL Office Q4 2025 — hardcoded source data ───────────────────────────────

interface JllData {
  takeUp2025:      number  // m²
  vacancyRate:     number  // %
  primeRent:       number  // €/m²/jr
  investmentVolume: number // M€
  primeNIY:        number  // %
  pipeline2030:    number  // m²
}

const JLL: Record<string, JllData> = {
  eindhoven: {
    takeUp2025:       25_300,
    vacancyRate:       6.7,
    primeRent:       265,
    investmentVolume:  66.1,
    primeNIY:          6.00,
    pipeline2030:    175_400,
  },
  rotterdam: {
    takeUp2025:       54_500,
    vacancyRate:       6.1,
    primeRent:       360,
    investmentVolume: 276,
    primeNIY:          5.50,
    pipeline2030:    190_200,
  },
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
      {/* Axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, paddingLeft: 138 }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v} style={{ fontSize: 10, color: 'var(--c-subtle)' }}>{v}%</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gebieden.map((g) => {
          const effectiveStatus = getStatus(g.id, g.status ?? 'live')
          const statusCfg = effectiveStatus !== 'live' ? GEBIED_STATUS_CONFIG[effectiveStatus] : null
          return (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Label + optionele status dot */}
            <div style={{ minWidth: 130, maxWidth: 130, display: 'flex', alignItems: 'center', gap: 4 }}>
              {statusCfg && (
                <span
                  title={statusCfg.label}
                  style={{ fontSize: 10, color: statusCfg.text, flexShrink: 0 }}
                >
                  {statusCfg.dot}
                </span>
              )}
            <span
              style={{
                fontSize: 11,
                color: 'var(--c-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {g.naam}
            </span>
            </div>

            {/* Stacked bar */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                height: 20,
                borderRadius: 4,
                overflow: 'hidden',
                background: '#f0ede8',
              }}
            >
              {Object.keys(MIX).map((key) => {
                const pct = g.vastgoedMix[key as keyof typeof g.vastgoedMix]
                if (!pct) return null
                return (
                  <div
                    key={key}
                    title={`${MIX[key].label}: ${pct}%`}
                    style={{ width: `${pct}%`, background: MIX[key].color }}
                  />
                )
              })}
            </div>

            {/* Kantoor % callout */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#ff7f50',
                minWidth: 28,
                textAlign: 'right',
              }}
            >
              {g.vastgoedMix.kantoor}%
            </span>
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
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-subtle)' }}>
          Getal = kantooraandeel
        </div>
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
          alignItems: 'center',
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

function StadPanel({ stad }: { stad: Stad }) {
  const jll = JLL[stad.id]
  const { getStatus } = useGebiedStatus()
  const allUnderConstruction = stad.gebieden.every(
    (g) => getStatus(g.id, g.status ?? 'live') !== 'live'
  )

  // ── Aggregate marktdata ────
  const totaalVVO         = stad.gebieden.reduce((s, g) => s + g.marktdata.totaalKantoorVvo, 0)
  const opname            = stad.gebieden.reduce((s, g) => s + g.marktdata.opnameVorigeJaar, 0)
  const aantalOntwikkeling = stad.gebieden.reduce((s, g) => s + g.pandenInOntwikkeling.length, 0)


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
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--c-subtle)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                JLL Office · Q4 2025
              </div>
            </div>

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
                  flexShrink: 0,
                }}
              >
                {/* Warning icon */}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M6.5 1.5L12 11.5H1L6.5 1.5Z"
                    stroke="#d97706"
                    strokeWidth="1.3"
                    fill="rgba(217,119,6,0.12)"
                    strokeLinejoin="round"
                  />
                  <line x1="6.5" y1="5.5" x2="6.5" y2="8.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="6.5" cy="10" r="0.7" fill="#d97706" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                  Data in opbouw
                </span>
              </div>
            )}
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
              <KpiItem isFirst storageKey={`kpi.${stad.id}.takeup`} label="Take-up 2025" value={`${(jll.takeUp2025 / 1000).toFixed(1)}k m²`} sub="JLL Q4 2025" bron={BRONNEN.jll} />
              <KpiItem isFirst={false} storageKey={`kpi.${stad.id}.vacancy`} label="Vacancy rate" value={`${jll.vacancyRate}%`} sub="JLL Q4 2025" bron={BRONNEN.jll} />
              <KpiItem isFirst={false} storageKey={`kpi.${stad.id}.primerent`} label="Prime rent" value={`€${jll.primeRent}/m²`} sub="per jaar" bron={BRONNEN.jll} />
              <KpiItem isFirst={false} storageKey={`kpi.${stad.id}.investvol`} label="Investment vol." value={`€${jll.investmentVolume}M`} sub="2025 totaal" bron={BRONNEN.jll} />
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
                  { label: 'Totaal kantoor VVO',       value: fmM2(totaalVVO),                  bron: BRONNEN.vvo },
                  { label: 'Vacancy rate (JLL)',        value: `${jll?.vacancyRate}%`,            bron: BRONNEN.jll },
                  { label: 'Opname 2025 (gebieden)',    value: fmM2(opname),                     bron: BRONNEN.opname },
                  { label: 'Take-up 2025 (JLL)',        value: fmM2(jll?.takeUp2025 ?? 0),       bron: BRONNEN.jll },
                  { label: 'Pijplijn 2026–2030 (JLL)', value: fmM2(jll?.pipeline2030 ?? 0),     bron: BRONNEN.jll },
                  { label: 'Panden in ontwikkeling',   value: `${aantalOntwikkeling}`,           bron: BRONNEN.vvo },
                ].map(({ label, value, bron }) => (
                  <div
                    key={label}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--c-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <EditableText storageKey={`ind.${stad.id}.${label}.label`} defaultValue={label} />
                      {bron && <BronTooltip bron={bron} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', textAlign: 'right' }}>
                      <EditableText storageKey={`ind.${stad.id}.${label}.value`} defaultValue={value} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right column — vastgoedmix chart */}
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
    bron: 'Michiel Bijmolt — testmoment 24 april 2026',
  },
  {
    label: 'Warme ingangen uit CRM',
    toelichting: 'Overzicht van bekende contacten (Edge Eindhoven, The Pulse, HERE Technologies, Aroundtown, NSI) herkend als bruikbaar vertrekpunt. Sluit aan op hoe het BD-team in de praktijk werkt.',
    status: 'bevestigd',
    bron: 'Mattijs Kaak — testmoment 17 april 2026',
  },
  {
    label: 'Differentiatie per dienstvorm (Fast Fit-Out / Smart Moves / D&B)',
    toelichting: 'Duidelijk en groot verschil bevestigd. Fast Fit-Out = snelheid; Smart Moves = technologie en data; Design & Build = meest uitgebreide propositie met beide elementen.',
    status: 'bevestigd',
    bron: 'Michiel Bijmolt — testmoment 24 april 2026',
  },
  {
    label: 'Eerste contact altijd telefonisch',
    toelichting: 'Bevestigd: koude e-mail werkt te afstandelijk. Bellen geeft directe mogelijkheid om het gesprek te sturen op totale ontzorging. Bij geen reactie: twee dagen later opnieuw bellen.',
    status: 'bevestigd',
    bron: 'Michiel Bijmolt — testmoment 24 april 2026',
  },
  {
    label: 'Marktcap-berekening per stad',
    toelichting: 'Redenering herkend en werkbaar als indicatie. Verzocht om Amsterdam en Utrecht toe te voegen zodat nieuwe doelsteden naast bestaande markten kunnen worden afgezet.',
    status: 'deels',
    bron: 'Mattijs Kaak — testmoment 17 april 2026',
  },
  {
    label: 'Gespreksopbouw per type partij',
    toelichting: 'Indeling herkend maar uitwerking op gespreksinhoudniveau te globaal. Bij advocatenkantoren: andere taal, kleding en nadruk. Bij gebouweigenaren: verhuurbaarheid centraal, niet fit-out investering.',
    status: 'deels',
    bron: 'Michiel Bijmolt — testmoment 24 april 2026',
  },
  {
    label: 'Smart Moves als ingang voor gebouweigenaren',
    toelichting: 'Instaplogica Smart Moves richting gebouweigenaren (leegstandsanalyse als trigger) ontbrak in het prototype. Verbetersuggestie: proactief benaderen op basis van leegstandscijfers per stad.',
    status: 'ontbreekt',
    bron: 'Michiel Bijmolt — testmoment 24 april 2026',
  },
  {
    label: 'Tab relevante spelers en panden per doelstad',
    toelichting: 'Direct gemis: zonder inzicht in welke partijen en panden relevant zijn, is de marktcap-berekening op zichzelf onvoldoende om een BD zonder voorkennis direct aan de slag te laten gaan.',
    status: 'ontbreekt',
    bron: 'Mattijs Kaak — testmoment 17 april 2026',
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
      {/* Header — altijd zichtbaar */}
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
              Bijlage 14 — testronde 1 (17 & 24 april 2026) · Mattijs Kaak & Michiel Bijmolt
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

      {/* Inhoud — uitklapbaar */}
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
          <EditableText storageKey="omgeving.titel" defaultValue="Omgevingskenmerken — Eindhoven" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em', display: 'block' }} onClick={(e) => e.stopPropagation()} />
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
                <EditableText storageKey="omgeving.hal2.context" defaultValue="HAL 2 is financieel sterk met bijna €1,3M eigen vermogen en ruim €950K winst. Ze opereren vanuit een gezonde kaspositie en kunnen concurreren op prijs. Ditt moet zich richten op snelheid, ontzorging en het ASML-netwerk — niet op prijs." tag="div" style={{ fontSize: 11, color: '#166534', lineHeight: 1.6 }} />
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
                <EditableText storageKey="omgeving.desque.context" defaultValue="Desque meldt expliciet een negatief eigen vermogen per 31 dec 2024 en continuïteitsonzekerheid. Kortlopende schulden overstijgen vlottende activa. Dit biedt een opening: opdrachtgevers die zekerheid zoeken over oplevering en nakoming zijn een directe kans voor Ditt." tag="div" style={{ fontSize: 11, color: '#991b1b', lineHeight: 1.6 }} />
              </div>
            </div>

            {/* D&B activiteit Eindhoven */}
            <div style={{ background: '#f8f7f5', borderRadius: 10, padding: '16px', border: '1px solid var(--c-border)' }}>
              <EditableText storageKey="omgeving.db.titel" defaultValue="Design & Build activiteit — Eindhoven" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, display: 'block' }} />
              <EditableText storageKey="omgeving.db.meta" defaultValue="Bekende opdrachten in de markt · 2023–2025" style={{ fontSize: 11, color: 'var(--c-subtle)', marginBottom: 12, display: 'block' }} />

              {[
                { id: 'sweco', partij: 'Sweco Architecten → HAL 2 B.V.', aantal: '4 opdrachten', context: 'Sweco, dat veel projecten uitvoert voor ASML, heeft HAL 2 vier keer ingeschakeld voor Design & Build. Dit bevestigt HAL 2 als vaste partner in de ASML-keten — een netwerk dat voor Ditt nog niet ontsloten is.' },
                { id: 'yksi-geva', partij: 'Yksi Ontwerp + De Bever Architecten → Geva Vastgoed', aantal: '2 opdrachten op Strijp-T', context: 'Yksi Ontwerp (interieurarchitect) voerde samen met De Bever Architecten twee opdrachten uit op Strijp-T voor Geva Vastgoed — een grote eigenaar in de Eindhovense markt. Geva is nog geen warme relatie voor Ditt.' },
                { id: 'yksi-htc', partij: 'Yksi Ontwerp — Hightech Campus', aantal: '2 opdrachten', context: 'Twee opdrachten op de Hightech Campus bevestigen dat Yksi actief is in het ASML-ecosysteem. De campus is een groeisegment waarbij Ditt tot nu toe niet in beeld is.' },
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
    naam: 'HTC-ASML (Veldhoven)',
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
    naam: 'Eindhoven Centrum',
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
        context: 'Na overdracht van Achmea aan Investe Group volgt doorgaans herpositionering en nieuwe verhuur. Nieuwe eigenaar investeert veelal in kwaliteitsverbetering — een kans voor D&B-acquisitie bij fit-out van instromende huurders.',
      },
      {
        adres: 'Vestdijk 45, Eindhoven',
        verkoper: 'Cantera Beheer',
        koper: 'Van der Valk',
        koopsom: '~€60–70M',
        datum: 'februari 2025',
        context: 'Hotel-acquisitie in het centrum bevestigt actieve investeringsmarkt. Van der Valk investeert in transformatie en herinrichting — een type project waarbij Ditt inzetbaar is voor interieur Design & Build.',
      },
      {
        adres: 'Kennedyplein 300, Eindhoven',
        verkoper: 'Aberdeen Standard Investments',
        koper: 'Gemeente Eindhoven',
        koopsom: '~€20–25M',
        datum: 'december 2025',
        context: 'Onderdeel van het Fellenoord transformatieplan. De gemeente koopt panden strategisch op om herontwikkeling mogelijk te maken. Huurders die verplaatst worden zoeken vervangende kantoorruimte — directe BD-kans.',
      },
    ],
  },
  {
    id: 'eindhoven-airport',
    naam: 'Eindhoven Airport / Flight Forum',
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
        context: 'Nieuwe eigenaar op strategische locatie dicht bij luchthaven. Breadstone is actief als vastgoedinvesteerder en zal pand verhuurklaar maken — kans voor Ditt bij cat-A/cat-B inrichting.',
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
        context: 'Flight-to-quality: internationale scheepvaartgigant MSC neemt topkantoor op A-locatie Blaak. Gebruikersovername van deze omvang gepaard met volledige herinrichting naar eigen bedrijfsidentiteit — core D&B-propositie.',
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
        context: 'Provast staat bekend om herontwikkeling van kantoorpanden. Aankoop van Bouwinvest duidt op transformatieproject in voorbereiding — ideale instap voor Ditt in vroeg stadium.',
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
        context: 'DWS (Deutsche Bank vastgoedtak) verkoopt aan Corum Origin. Nieuwe eigenaar investeert in verhuurbaarheid — kans om vroeg in gesprek te komen over inrichting van verhuurbare units.',
      },
      {
        adres: 'Rivium Quadrant 81, Capelle a/d IJssel',
        verkoper: 'Harbert / Quan Real Estate',
        koper: 'Schouten Zekerheid',
        koopsom: '~€9–10M',
        datum: 'november 2024',
        context: 'Eindgebruiker koopt eigen kantoorpand. Schouten Zekerheid is verzekeringsadviseur die nu eigenaar wordt van eigen pand — directe inrichtingsvraag voor eigen werkplek is te verwachten.',
      },
    ],
  },
  {
    id: 'fellenoord',
    naam: 'Fellenoord',
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
        context: 'Samen met Kennedyplein 100 heeft de gemeente nu €38–45M aan Fellenoord-vastgoed in handen. Huurders van beide panden worden actief op zoek naar vervangende locaties — dit is een van de sterkste verhuistriggers in Eindhoven momenteel.',
      },
      {
        adres: 'Professor Dr Dorgelolaan 20, Eindhoven',
        verkoper: 'VB Groep',
        koper: 'Rijksvastgoedbedrijf',
        koopsom: '~€12–14M',
        datum: 'april 2025',
        context: 'Rijksoverheid verwerft pand voor eigen gebruik. Bestaande huurders zoeken vervangende kantoorruimte in Eindhoven — een groep met bekende eisen en budgetten, direct inzetbaar voor Smart Moves of D&B.',
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
              Koper · Verkoper · Koopsom · Strategische context — bron: Vastgoeddata.nl
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
                        {t.adres}
                      </div>

                      {/* Verkoper → Koper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 8px' }}>
                          {t.verkoper}
                        </span>
                        <span style={{ fontSize: 11, color: colors.accent, fontWeight: 700 }}>→</span>
                        <span style={{ fontSize: 11, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '2px 8px' }}>
                          {t.koper}
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
                          {t.koopsom}
                        </span>
                        <span
                          style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)',
                          }}
                        >
                          {t.datum}
                        </span>
                      </div>

                      {/* Context */}
                      <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6 }}>
                        {t.context}
                      </div>
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

// ── StadOverzichtView ─────────────────────────────────────────────────────────

export default function StadOverzichtView() {
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
          Marktindicatoren per stad — JLL Office Q4 2025 · Vastgoeddata.nl april 2026
        </p>
      </div>

      {/* Stad panels */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {steden.map((stad) => (
          <StadPanel key={stad.id} stad={stad} />
        ))}
      </div>

      {/* Testvalidatie */}
      <TestvalidatiePanel />

      {/* Omgevingskenmerken */}
      <OmgevingskenmerkenPanel />

      {/* Recente transacties */}
      <RecenteTransactiesPanel />

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
        <br /><br />
        <span style={{ color: 'var(--c-subtle)' }}>
          Hover over het <strong>ⓘ</strong>-icoon naast een waarde voor de specifieke bron.
        </span>
      </div>
    </div>
  )
}
