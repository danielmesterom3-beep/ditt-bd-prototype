import { useState } from 'react'
import steden from '../data/steden'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import type { GebiedStatus } from '../data/types'

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GebiedStatus, { label: string; bg: string; text: string; border: string }> = {
  'under-construction': { label: 'Under construction', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'in-progress':        { label: 'In progress',        bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'live':               { label: 'Live',               bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
}

const STATUS_ORDER: GebiedStatus[] = ['under-construction', 'in-progress', 'live']

const STAD_TEMPLATE = `{
  id: 'nieuw-stad-id',          // unieke slug, bijv. 'utrecht'
  naam: 'Stad Naam',
  gebieden: nieuwStadGebieden,  // importeer uit nieuw-stad.ts
}`

const GEBIED_TEMPLATE = `{
  id: 'gebied-id',              // bijv. 'utrecht-centrum'
  naam: 'Gebiedsnaam',
  status: 'under-construction', // start altijd hier

  marktdata: {
    peildatum: '',              // ISO-datum, bijv. '2026-01-01'
    totaalKantoorVvo: 0,        // m² verhuurbaar vloeroppervlak
    leegstandPercentage: 0,     // bijv. 12.5
    huurprijsBandwidth: { min: 0, max: 0 },  // EUR/m²/jaar
    opnameVorigeJaar: 0,        // m² opgenomen vorig jaar
    beschikbaarAanbod: 0,       // m² direct beschikbaar
  },

  vastgoedMix: {
    kantoor: 0,   // percentages, moeten optellen tot 100
    retail: 0,
    wonen: 0,
    overig: 0,
  },

  pandenInOntwikkeling: [],   // zie PandInOntwikkeling type

  trends: [],                 // zie Trend type (id, omschrijving, richting)

  warmeContacten: [],         // zie WarmContact type

  interessanteOpdrachtgevers: [],  // zie InteressanteOpdrachtgever type

  inzichten: [],              // zie InterviewInzicht type

  partijen: [],               // zie Partij type
}`

// ── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GebiedStatus }) {
  const s = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 20,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {status === 'live' ? '●' : status === 'in-progress' ? '◑' : '○'}
      {s.label}
    </span>
  )
}

function StatusCycleButton({
  gebiedId,
  currentStatus,
}: {
  gebiedId: string
  currentStatus: GebiedStatus
}) {
  const { setStatus } = useGebiedStatus()
  const idx = STATUS_ORDER.indexOf(currentStatus)
  const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
  const nextCfg = STATUS_CONFIG[next]

  return (
    <button
      onClick={() => setStatus(gebiedId, next)}
      title={`Zet naar: ${nextCfg.label}`}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 20,
        background: 'var(--c-surface)',
        color: 'var(--c-muted)',
        border: '1px solid var(--c-border)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      → {nextCfg.label}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <pre
        style={{
          background: '#1a1a1a',
          color: '#e5e7eb',
          borderRadius: 10,
          padding: '16px 20px',
          fontSize: 12,
          lineHeight: 1.7,
          overflow: 'auto',
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          border: '1px solid #2a2a2a',
        }}
      >
        {code}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 6,
          background: copied ? '#065f46' : '#2a2a2a',
          color: copied ? '#d1fae5' : '#9ca3af',
          border: '1px solid #3a3a3a',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {copied ? 'Gekopieerd' : 'Kopieer'}
      </button>
    </div>
  )
}

// ── BeheerView ────────────────────────────────────────────────────────────────

export default function BeheerView() {
  const { getStatus, setStatus, overrides } = useGebiedStatus()
  const [templateOpen, setTemplateOpen] = useState(false)

  const shareUrl = `${window.location.origin}${window.location.pathname}#beheer`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>

      {/* ── Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--c-text)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Stadsbeheer
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 20,
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Intern
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0, lineHeight: 1.6 }}>
          Beheer de structuur en status van steden en gebieden. Gedeelde link voor het team:
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            padding: '6px 12px',
            background: '#f8f7f5',
            borderRadius: 8,
            border: '1px solid var(--c-border)',
          }}
        >
          <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--c-text)' }}>
            {shareUrl}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--c-surface)',
              color: 'var(--c-muted)',
              border: '1px solid var(--c-border)',
              cursor: 'pointer',
            }}
          >
            Kopieer link
          </button>
        </div>
      </div>

      {/* ── Sectie 1: Gebiedsstatus per stad ── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--c-subtle)',
            marginBottom: 14,
          }}
        >
          Gebiedsstatus per stad
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steden.map((stad) => (
            <div
              key={stad.id}
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Stad header */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#faf9f7',
                  borderBottom: '1px solid var(--c-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
                  {stad.naam}
                </span>
                <span style={{ fontSize: 12, color: 'var(--c-subtle)' }}>
                  {stad.gebieden.length} gebied{stad.gebieden.length !== 1 ? 'en' : ''}
                </span>
              </div>

              {/* Gebieden */}
              <div>
                {stad.gebieden.map((gebied, i) => {
                  const effectiveStatus = getStatus(gebied.id, gebied.status ?? 'live')
                  const isLast = i === stad.gebieden.length - 1
                  return (
                    <div
                      key={gebied.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderBottom: isLast ? 'none' : '1px solid var(--c-border)',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
                          {gebied.naam}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
                          {gebied.id}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <StatusBadge status={effectiveStatus} />
                        <StatusCycleButton gebiedId={gebied.id} currentStatus={effectiveStatus} />
                        {/* Reset knop — alleen zichtbaar als er een override is */}
                        {gebied.id in overrides && (
                          <button
                            onClick={() => setStatus(gebied.id, gebied.status ?? 'live')}
                            title="Reset naar standaard"
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 20,
                              background: 'transparent',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              cursor: 'pointer',
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sectie 2: Nieuwe stad toevoegen ── */}
      <div>
        <button
          onClick={() => setTemplateOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            borderRadius: templateOpen ? '12px 12px 0 0' : 12,
            cursor: 'pointer',
            marginBottom: 0,
          }}
        >
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
              Nieuwe stad toevoegen
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
              Structuur en templates voor het aanmaken van een nieuwe stad
            </div>
          </div>
          <span style={{ fontSize: 16, color: 'var(--c-subtle)', transform: templateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            ↓
          </span>
        </button>

        {templateOpen && (
          <div
            style={{
              border: '1px solid var(--c-border)',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '20px 18px',
              background: 'var(--c-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Instructies */}
            <div
              style={{
                padding: '14px 16px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0c4a6e', marginBottom: 8 }}>
                Hoe een nieuwe stad toevoegen
              </div>
              <ol style={{ fontSize: 12, color: '#075985', margin: 0, paddingLeft: 18, lineHeight: 2 }}>
                <li>Maak een nieuw bestand aan: <code style={{ fontFamily: 'ui-monospace, monospace', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>src/data/[stad-id].ts</code></li>
                <li>Kopieer de gebiedtemplate hieronder en vul de velden in</li>
                <li>Importeer het bestand in <code style={{ fontFamily: 'ui-monospace, monospace', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>src/data/steden.ts</code></li>
                <li>Voeg de stad toe aan de <code style={{ fontFamily: 'ui-monospace, monospace', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>steden</code> array met het stadtemplate</li>
                <li>Voeg indien gewenst JLL-data toe in <code style={{ fontFamily: 'ui-monospace, monospace', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>StadOverzichtView.tsx</code> (JLL Record)</li>
              </ol>
            </div>

            {/* Stad template */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 8 }}>
                1. Toevoegen aan <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>steden.ts</code>
              </div>
              <CodeBlock code={STAD_TEMPLATE} />
            </div>

            {/* Gebied template */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 8 }}>
                2. Gebiedstructuur template — kopieer per gebied in <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>[stad-id].ts</code>
              </div>
              <CodeBlock code={GEBIED_TEMPLATE} />
            </div>

            {/* Statusuitleg */}
            <div
              style={{
                padding: '14px 16px',
                background: '#faf9f7',
                border: '1px solid var(--c-border)',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted)', marginBottom: 10 }}>
                Statusuitleg per gebied
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUS_ORDER.map((s) => {
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <StatusBadge status={s} />
                      <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
                        {s === 'under-construction' && 'Data nog niet beschikbaar. Structuur aangemaakt, velden zijn lege placeholders.'}
                        {s === 'in-progress'        && 'Data wordt stapsgewijs aangevuld. Gedeeltelijk zichtbaar in het dashboard.'}
                        {s === 'live'               && 'Data compleet en volledig zichtbaar. Geen statusbadge in het dashboard.'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--c-subtle)',
          padding: '10px 14px',
          background: '#f8f7f5',
          borderRadius: 8,
          border: '1px solid var(--c-border)',
        }}
      >
        Statuswijzigingen worden opgeslagen in <code style={{ fontFamily: 'ui-monospace, monospace' }}>localStorage</code> van de browser.
        Voor permanente wijzigingen: pas het <code style={{ fontFamily: 'ui-monospace, monospace' }}>status</code>-veld direct aan in het databestand van het gebied.
      </div>
    </div>
  )
}
