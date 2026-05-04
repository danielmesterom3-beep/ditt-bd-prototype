import { useState } from 'react'
import type {
  LocatieKlasse,
  PandInOntwikkeling,
  OntwikkelingFase,
  Trend,
  TrendRichting,
  WarmContact,
  InteressanteOpdrachtgever,
  OpdrachtgeverStatus,
  PartijenType,
  Gebied,
  InterviewInzicht,
  InzichtCategorie,
  GebiedStatus,
  KansrijkeLead,
} from '../data/types'
import { useNavigation } from '../context/NavigationContext'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import EditableText from '../components/EditableText'

// ── Helpers ───────────────────────────────────────────────────────────────────

function klasseVanGebied(gebied: Gebied): LocatieKlasse {
  const klassen = gebied.partijen
    .map((p) => p.locatieKlasse)
    .filter((k): k is NonNullable<LocatieKlasse> => k !== null)
  if (!klassen.length) return null
  const tally = klassen.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1; return acc
  }, {})
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as NonNullable<LocatieKlasse>
}

function fmM2(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M m²`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k m²`
  return `${n} m²`
}

// ── Style constants ───────────────────────────────────────────────────────────

const KLASSE_STYLE: Record<NonNullable<LocatieKlasse>, { bg: string; text: string; border: string }> = {
  A: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  B: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  C: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
}

const FASE_STYLE: Record<OntwikkelingFase, { bg: string; text: string; label: string }> = {
  planfase:   { bg: '#f1f5f9', text: '#475569', label: 'Planfase' },
  vergunning: { bg: '#dbeafe', text: '#1d4ed8', label: 'Vergunning' },
  bouw:       { bg: '#ffedd5', text: '#c2410c', label: 'In bouw' },
  oplevering: { bg: '#d1fae5', text: '#065f46', label: 'Oplevering' },
}

const OG_STATUS_STYLE: Record<OpdrachtgeverStatus, { bg: string; text: string; label: string }> = {
  prospect:    { bg: '#f1f5f9', text: '#475569', label: 'Prospect' },
  'in-gesprek': { bg: '#fef3c7', text: '#92400e', label: 'In gesprek' },
  gewonnen:    { bg: '#d1fae5', text: '#065f46', label: 'Gewonnen' },
}

const TREND_STYLE: Record<TrendRichting, { icon: string; color: string; bg: string }> = {
  positief: { icon: '↑', color: '#059669', bg: '#f0fdf4' },
  neutraal: { icon: '→', color: '#d97706', bg: '#fffbeb' },
  negatief: { icon: '↓', color: '#dc2626', bg: '#fef2f2' },
}

const MIX_COLORS: Record<string, string> = {
  kantoor: '#ff7f50',
  retail:  '#5bb8c4',
  wonen:   '#8fc4a0',
  overig:  '#c8b8a5',
}

const MIX_LABELS: Record<string, string> = {
  kantoor: 'Kantoor', retail: 'Retail', wonen: 'Wonen', overig: 'Overig',
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--c-subtle)',
          margin: '0 0 14px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ── Section 1: Gebiedskenmerken ───────────────────────────────────────────────

function Gebiedskenmerken({ gebied }: { gebied: Gebied }) {
  const gebiedId = gebied.id
  const { marktdata: m, vastgoedMix: mix } = gebied
  const gem = ((m.huurprijsBandwidth.min + m.huurprijsBandwidth.max) / 2).toFixed(0)

  const rows = [
    { label: 'Totaal kantoor VVO',  value: fmM2(m.totaalKantoorVvo) },
    { label: 'Leegstand',           value: `${m.leegstandPercentage}%`,
      color: m.leegstandPercentage > 15 ? '#dc2626' : m.leegstandPercentage > 8 ? '#d97706' : '#059669' },
    { label: 'Beschikbaar aanbod',  value: fmM2(m.beschikbaarAanbod) },
    { label: 'Huurprijs (min)',     value: `€${m.huurprijsBandwidth.min}/m²/jr` },
    { label: 'Huurprijs (max)',     value: `€${m.huurprijsBandwidth.max}/m²/jr` },
    { label: 'Huurprijs (gem. ~)',  value: `€${gem}/m²/jr` },
    { label: 'Opname 2025',        value: fmM2(m.opnameVorigeJaar) },
    { label: 'Peildatum',           value: m.peildatum },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Data tabel */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {rows.map(({ label, value, color }, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 16px',
              background: i % 2 === 0 ? 'transparent' : '#faf9f7',
              borderBottom: i < rows.length - 1 ? '1px solid var(--c-border)' : 'none',
            }}
          >
            <EditableText storageKey={`gkm.${gebiedId}.${label}.label`} defaultValue={label} style={{ fontSize: 12, color: 'var(--c-muted)' }} />
            <EditableText storageKey={`gkm.${gebiedId}.${label}.value`} defaultValue={value} style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--c-text)' }} />
          </div>
        ))}
      </div>

      {/* Vastgoedmix visual */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 12,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Kantoor highlight */}
        <div
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #fff7f4, #fff2ee)',
            border: '1px solid #ffd4c2',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)' }}>
              Kantooraandeel
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--c-coral)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {mix.kantoor}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>van totale vastgoedmix</div>
          </div>
          {/* Mini pie-like donut in coral */}
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#f0ede8" strokeWidth="8" />
            <circle
              cx="28" cy="28" r="22"
              fill="none"
              stroke="#ff7f50"
              strokeWidth="8"
              strokeDasharray={`${(mix.kantoor / 100) * 138.2} 138.2`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </svg>
        </div>

        {/* Stacked bar */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginBottom: 8, fontWeight: 500 }}>
            Volledige vastgoedmix
          </div>
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: '#f0ede8' }}>
            {Object.entries(mix).map(([key, pct]) =>
              pct > 0 ? (
                <div
                  key={key}
                  title={`${MIX_LABELS[key]}: ${pct}%`}
                  style={{ width: `${pct}%`, background: MIX_COLORS[key] }}
                />
              ) : null
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
            {Object.entries(mix).map(([key, pct]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: MIX_COLORS[key] }} />
                <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                  {MIX_LABELS[key]} {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section 2: Panden in ontwikkeling ────────────────────────────────────────

function PandCard({ pand }: { pand: PandInOntwikkeling }) {
  const [open, setOpen] = useState(false)
  const fase = FASE_STYLE[pand.fase]

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <EditableText storageKey={`pand.${pand.id}.naam`} defaultValue={pand.naam || pand.adres} style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', lineHeight: 1.3 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20,
              background: fase.bg,
              color: fase.text,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {fase.label}
          </span>
        </div>

        <EditableText storageKey={`pand.${pand.id}.adres`} defaultValue={pand.adres} style={{ fontSize: 11, color: 'var(--c-subtle)', marginBottom: 10, display: 'block' }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: '#f8f7f5', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-subtle)' }}>
              Kantoor m²
            </div>
            <EditableText storageKey={`pand.${pand.id}.opp`} defaultValue={fmM2(pand.oppervlakte)} style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-coral)', marginTop: 2, display: 'block' }} />
          </div>
          <div style={{ flex: 1, background: '#f8f7f5', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-subtle)' }}>
              Oplevering
            </div>
            <EditableText storageKey={`pand.${pand.id}.oplevering`} defaultValue={pand.verwachteOplevering} style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginTop: 2, display: 'block' }} />
          </div>
        </div>

        {pand.ontwikkelaar && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--c-muted)' }}>
            <span style={{ fontWeight: 600 }}>Ontwikkelaar:</span> {pand.ontwikkelaar}
          </div>
        )}
      </div>

      {/* Expandable toelichting */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '8px 16px',
          background: open ? '#faf9f7' : 'transparent',
          border: 'none',
          borderTop: '1px solid var(--c-border)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--c-subtle)',
          fontWeight: 500,
        }}
      >
        <span>Toelichting</span>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div
          style={{
            padding: '10px 16px 14px',
            fontSize: 11,
            color: 'var(--c-muted)',
            lineHeight: 1.7,
            background: '#faf9f7',
          }}
        >
          <EditableText storageKey={`pand.${pand.id}.toelichting`} defaultValue={pand.toelichting} tag="div" style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.7 }} />
        </div>
      )}
    </div>
  )
}

// ── Section 3: Trends ─────────────────────────────────────────────────────────

function TrendItem({ trend }: { trend: Trend }) {
  const s = TREND_STYLE[trend.richting]
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        background: s.bg,
        border: `1px solid ${s.color}22`,
        borderLeft: `3px solid ${s.color}`,
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 16, color: s.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {s.icon}
      </span>
      <EditableText storageKey={`trend.${trend.id}.omschrijving`} defaultValue={trend.omschrijving} style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }} />
    </div>
  )
}

// ── Section 4: Interessante opdrachtgevers (SFO) ──────────────────────────────

function OpdrachtgeverCard({ og }: { og: InteressanteOpdrachtgever }) {
  const s = OG_STATUS_STYLE[og.status]
  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <EditableText storageKey={`og.${og.id}.naam`} defaultValue={og.naam || 'Anoniem profiel'} style={{ fontWeight: 600, fontSize: 13, color: og.naam ? 'var(--c-text)' : 'var(--c-subtle)' }} />
          <div
            style={{
              display: 'inline-block',
              marginTop: 3,
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: 20,
              background: '#f1f5f9',
              color: '#475569',
            }}
          >
            <EditableText storageKey={`og.${og.id}.sector`} defaultValue={og.sector} />
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 20,
            background: s.bg,
            color: s.text,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {s.label}
        </span>
      </div>

      {/* Profiel */}
      <EditableText storageKey={`og.${og.id}.profiel`} defaultValue={og.profiel} tag="div" style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.6 }} />

      {/* SFO-match */}
      <div
        style={{
          padding: '10px 12px',
          background: 'linear-gradient(135deg, #fff7f4, #fff2ee)',
          border: '1px solid #ffd4c2',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--c-coral)',
            marginBottom: 4,
          }}
        >
          SFO-match
        </div>
        <EditableText storageKey={`og.${og.id}.reden`} defaultValue={og.reden} tag="div" style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }} />
      </div>
    </div>
  )
}

// ── Section 5: Warme contacten ────────────────────────────────────────────────

function ActionBtn({
  href,
  label,
  icon,
  primary,
}: {
  href: string
  label: string
  icon: string
  primary?: boolean
}) {
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'opacity 0.15s',
        background: primary ? 'var(--c-coral)' : 'transparent',
        color: primary ? '#fff' : '#92400e',
        border: primary ? 'none' : '1px solid #fcd34d',
      }}
    >
      <span>{icon}</span>
      {label}
    </a>
  )
}

function WarmContactCard({ contact }: { contact: WarmContact }) {
  const [showNote, setShowNote] = useState(false)
  const heeftEmail    = !!contact.email
  const heeftTelefoon = !!contact.telefoon
  const heeftNotitie  = !!contact.notitie

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #fffbeb 0%, #fefce8 100%)',
        border: '1px solid #fcd34d',
        borderLeft: '4px solid #d97706',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(217,119,6,0.08)',
      }}
    >
      {/* Warm badge + header */}
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <EditableText storageKey={`wc.${contact.id}.naam`} defaultValue={contact.naam || 'Naamloos'} style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }} />
            <EditableText storageKey={`wc.${contact.id}.organisatie`} defaultValue={contact.organisatie} style={{ fontSize: 12, color: '#78716c', marginTop: 2, display: 'block' }} />
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 20,
              background: '#d97706',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            Warm contact
          </span>
        </div>

        {/* Rol badge */}
        <span
          style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 20,
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
          }}
        >
          <EditableText storageKey={`wc.${contact.id}.rol`} defaultValue={contact.rol} />
        </span>

        {contact.datumLaatsteContact && (
          <span
            style={{
              display: 'inline-block',
              marginLeft: 8,
              fontSize: 10,
              color: '#a8a29e',
            }}
          >
            Laatste contact: {contact.datumLaatsteContact}
          </span>
        )}
      </div>

      {/* Actieknoppen — altijd zichtbaar */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #fde68a',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {heeftEmail ? (
          <ActionBtn href={`mailto:${contact.email}`} label="E-mail" icon="✉" primary />
        ) : (
          <EditableText
            storageKey={`wc.${contact.id}.email`}
            defaultValue="E-mail toevoegen..."
            style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic', cursor: 'text' }}
          />
        )}
        {heeftTelefoon ? (
          <ActionBtn href={`tel:${contact.telefoon}`} label="Bel" icon="↗" />
        ) : (
          <EditableText
            storageKey={`wc.${contact.id}.telefoon`}
            defaultValue="Telefoon toevoegen..."
            style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic', cursor: 'text' }}
          />
        )}

        {heeftNotitie && (
          <button
            onClick={() => setShowNote(!showNote)}
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 500,
              color: '#92400e',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, transition: 'transform 0.15s', display: 'inline-block', transform: showNote ? 'rotate(90deg)' : 'none' }}>
              ›
            </span>
            {showNote ? 'Verberg notitie' : 'Toon notitie'}
          </button>
        )}
      </div>

      {/* Notitie — uitklapbaar */}
      {showNote && heeftNotitie && (
        <div
          style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid #fde68a',
            fontSize: 12,
            color: '#78716c',
            lineHeight: 1.75,
            background: 'rgba(255,255,255,0.6)',
          }}
        >
          <EditableText storageKey={`wc.${contact.id}.notitie`} defaultValue={contact.notitie} tag="div" style={{ fontSize: 12, color: '#78716c', lineHeight: 1.75 }} />
        </div>
      )}
    </div>
  )
}

// ── Contactprotocol ───────────────────────────────────────────────────────────

type Product    = 'design-and-build' | 'smart-moves' | 'fast-fit-out' | 'turnkey'

interface ProtocolInhoud {
  aanpak:   string
  kapstok:  string
}

const PRODUCTEN: { id: Product; label: string; kort: string }[] = [
  { id: 'design-and-build', label: 'Design & Build',  kort: 'D&B'    },
  { id: 'smart-moves',      label: 'Smart Moves',     kort: 'SM'     },
  { id: 'fast-fit-out',     label: 'Fast Fit-Out',    kort: 'FFO'    },
  { id: 'turnkey',          label: 'Turnkey',         kort: 'TK'     },
]

const PARTIJ_TYPEN: { id: PartijenType; label: string }[] = [
  { id: 'makelaar', label: 'Makelaar'  },
  { id: 'eigenaar', label: 'Eigenaar'  },
  { id: 'huurder',  label: 'Huurder'   },
]

const KLASSE_AANBEVELING: Record<NonNullable<LocatieKlasse>, Product> = {
  A: 'smart-moves',
  B: 'design-and-build',
  C: 'fast-fit-out',
}

const PROTOCOL: Record<Product, Record<PartijenType, ProtocolInhoud>> = {
  'design-and-build': {
    makelaar: {
      aanpak: 'Vraag naar panden in portefeuille met verhuurleegstand of aankomende mutaties. Positioneer D&B als compleet inrichtingsconcept voor nieuwe huurders — verhoogt aantrekkingskracht zonder risico voor de eigenaar.',
      kapstok: 'Welke objecten in uw portefeuille hebben op dit moment een actieve verhuurvraag of aankomende huurdersmutatie?',
    },
    eigenaar: {
      aanpak: 'Presenteer D&B als totaaloplossing bij herinrichting of renovatie. Nadruk op ontzorging: één aanspreekpunt van ontwerp tot oplevering, vaste prijs, bewezen proces.',
      kapstok: 'Heeft u plannen voor renovatie of herinrichting van uw pand in de komende 12–24 maanden?',
    },
    huurder: {
      aanpak: 'Ideaal voor huurders met eigen inrichtingswensen op een verse locatie. Positioneer als volledige regie over de eigen werkomgeving, van programma van eisen tot sleuteloverdracht.',
      kapstok: 'Hoe ziet uw ideale werkplek eruit en wat is uw tijdsplanning voor het betrekken van de nieuwe ruimte?',
    },
  },
  'smart-moves': {
    makelaar: {
      aanpak: 'Positioneer als snelle kwaliteitsupgrade voor bestaande huurders die willen vernieuwen. Vraag naar contractverlengingen waarbij een vernieuwde inrichting als verleiding meegegeven kan worden.',
      kapstok: 'Heeft u huurders wiens contract binnenkort verlengd wordt en die toe zijn aan een vernieuwde werkplek?',
    },
    eigenaar: {
      aanpak: 'Kostenefficiënte verbetering van bestaande kantoorruimte die de verhuurwaarde verhoogt. Geschikt als tussenoplossing bij doorverhuur, zonder volledige renovatiebudget.',
      kapstok: 'Wilt u de aantrekkingskracht van uw pand vergroten zonder een volledig renovatiebudget vrij te maken?',
    },
    huurder: {
      aanpak: 'Slimme aanpassing van de bestaande situatie — werkbeleving verbetert direct zonder grote verstoring van de dagelijkse operatie. Focus op ROI en snelheid.',
      kapstok: 'Wat zijn de grootste verbeterpunten in uw huidige werkomgeving die u snel wilt aanpakken?',
    },
  },
  'fast-fit-out': {
    makelaar: {
      aanpak: 'Uw sterkste troef bij huurkandidaten met tijdsdruk: vaste prijs, bewezen concept, snelle realisatie. Inzetbaar als doorslaggevend argument in concurrerende verhuursituaties.',
      kapstok: 'Heeft u huurkandidaten met een strakke deadline die twijfelen vanwege de inrichtingstijd?',
    },
    eigenaar: {
      aanpak: 'Verhoog bezettingsgraad door snel op te leveren. Geschikt voor objecten waar snelheid boven volledig maatwerk gaat. Beperkt risico, direct resultaat.',
      kapstok: 'Hoe lang staat uw pand al leeg en hoe urgent is het om snel een huurder te huisvesten?',
    },
    huurder: {
      aanpak: 'Tijdsdruk? Fast Fit-Out levert een functioneel en aantrekkelijk kantoor binnen de afgesproken doorlooptijd, vaste prijs, geen verrassingen.',
      kapstok: 'Wanneer moet u de nieuwe ruimte uiterlijk betrekken en hoeveel speelruimte heeft u in de planning?',
    },
  },
  'turnkey': {
    makelaar: {
      aanpak: 'Complete ontzorging van A tot Z voor complexe opgaven. Voor makelaars die hun klant maximaal willen bedienen bij grote relocatietrajecten of nieuwbouwprojecten.',
      kapstok: 'Heeft u een klant met een grootschalige verhuisopgave waarbij alles gecoördineerd moet worden?',
    },
    eigenaar: {
      aanpak: 'Totaalpakket inclusief ontwerp, bouw en oplevering — maximale ontzorging, één verantwoordelijke partij. Geschikt voor eigenaren die een pand instap-klaar willen aanbieden.',
      kapstok: 'Wilt u uw pand volledig ingehuurd aanbieden, inclusief een kant-en-klare werkplek voor de nieuwe huurder?',
    },
    huurder: {
      aanpak: 'Alles inbegrepen — van programma van eisen tot sleuteloverdracht. De huurder hoeft zich nergens anders mee bezig te houden. Ideaal bij complexe opgaven of beperkte interne capaciteit.',
      kapstok: 'Heeft u intern de capaciteit om een verhuistraject te coördineren, of wilt u dit volledig uit handen geven?',
    },
  },
}

function ContactProtocol({ klasse }: { klasse: LocatieKlasse }) {
  const aanbevolen = klasse ? KLASSE_AANBEVELING[klasse] : null
  const [product, setProduct]   = useState<Product>(aanbevolen ?? 'design-and-build')
  const [partijType, setPartijType] = useState<PartijenType>('makelaar')

  const inhoud = PROTOCOL[product][partijType]

  function TabBtn<T extends string>({
    label, active, aanbevolen: isAanbevolen, onClick,
  }: { id?: T; label: string; active: boolean; aanbevolen?: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: active ? 700 : 500,
          borderRadius: 8,
          border: `1px solid ${active ? 'var(--c-coral)' : 'var(--c-border)'}`,
          background: active ? 'var(--c-coral)' : isAanbevolen ? '#fff7f4' : 'var(--c-surface)',
          color: active ? '#fff' : isAanbevolen ? 'var(--c-coral)' : 'var(--c-muted)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {isAanbevolen && !active && (
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', background: 'var(--c-coral)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>
            TIP
          </span>
        )}
        {label}
      </button>
    )
  }

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--c-border)',
          background: '#faf9f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-subtle)' }}>
            Contactprotocol
          </div>
          {aanbevolen && (
            <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 3 }}>
              Aanbeveling voor{' '}
              <strong style={{ color: 'var(--c-coral)' }}>{klasse}-locatie</strong>
              {': '}
              {PRODUCTEN.find(p => p.id === aanbevolen)?.label}
            </div>
          )}
        </div>

        {/* Partij-type selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {PARTIJ_TYPEN.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPartijType(id)}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: partijType === id ? 700 : 500,
                borderRadius: 20,
                border: `1px solid ${partijType === id ? '#1a1a1a' : 'var(--c-border)'}`,
                background: partijType === id ? '#1a1a1a' : 'transparent',
                color: partijType === id ? '#fff' : 'var(--c-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Product tabs */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {PRODUCTEN.map(({ id, label }) => (
          <TabBtn
            key={id}
            id={id}
            label={label}
            active={product === id}
            aanbevolen={id === aanbevolen}
            onClick={() => setProduct(id)}
          />
        ))}
      </div>

      {/* Protocol content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Aanpak */}
        <div style={{ padding: '18px 20px', borderRight: '1px solid var(--c-border)' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--c-subtle)',
              marginBottom: 8,
            }}
          >
            Aanpak
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.75, margin: 0 }}>
            {inhoud.aanpak}
          </p>
        </div>

        {/* Kapstok */}
        <div style={{ padding: '18px 20px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--c-subtle)',
              marginBottom: 8,
            }}
          >
            Openingsvraag
          </div>
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #fff7f4, #fff2ee)',
              border: '1px solid #ffd4c2',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--c-text)',
              lineHeight: 1.75,
              fontStyle: 'italic',
            }}
          >
            "{inhoud.kapstok}"
          </div>
        </div>
      </div>
    </div>
  )
}

// ── InzichtKaarten ────────────────────────────────────────────────────────────

const CATEGORIE_STYLE: Record<InzichtCategorie, { bg: string; text: string; border: string; label: string }> = {
  marktdynamiek: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Marktdynamiek' },
  acquisitie:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', label: 'Acquisitie' },
  samenwerking:  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'Samenwerking' },
  inrichting:    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', label: 'Inrichting' },
}

function InzichtKaart({ inzicht }: { inzicht: InterviewInzicht }) {
  const cs = CATEGORIE_STYLE[inzicht.categorie]
  const datum = new Date(inzicht.datum).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderLeft: `3px solid ${cs.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Categorie badge + datum */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            padding: '2px 8px',
            borderRadius: 20,
            background: cs.bg,
            color: cs.text,
            border: `1px solid ${cs.border}`,
          }}
        >
          {cs.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>{datum}</span>
      </div>

      {/* Inzicht tekst */}
      <p style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.65, margin: 0 }}>
        {inzicht.inzicht}
      </p>

      {/* Bron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4, borderTop: '1px solid var(--c-border)' }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#f3f3f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--c-muted)',
            flexShrink: 0,
          }}
        >
          {inzicht.bron.charAt(0)}
        </span>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>{inzicht.bron}</span>
          <span style={{ fontSize: 11, color: 'var(--c-subtle)' }}> · {inzicht.organisatie}</span>
        </div>
      </div>
    </div>
  )
}

function InzichtKaarten({ inzichten }: { inzichten: InterviewInzicht[] }) {
  if (inzichten.length === 0) return null
  const [actief, setActief] = useState<InzichtCategorie | 'alle'>('alle')

  const categorieën = ['alle', ...Array.from(new Set(inzichten.map((i) => i.categorie)))] as (InzichtCategorie | 'alle')[]
  const gefilterd = actief === 'alle' ? inzichten : inzichten.filter((i) => i.categorie === actief)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categorieën.map((cat) => {
          const isAlle = cat === 'alle'
          const cs = isAlle ? null : CATEGORIE_STYLE[cat]
          const active = actief === cat
          return (
            <button
              key={cat}
              onClick={() => setActief(cat)}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                borderRadius: 20,
                border: `1px solid ${active && cs ? cs.border : active ? '#1a1a1a' : 'var(--c-border)'}`,
                background: active ? (cs ? cs.bg : '#1a1a1a') : 'transparent',
                color: active ? (cs ? cs.text : '#fff') : 'var(--c-muted)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {isAlle ? `Alle (${inzichten.length})` : CATEGORIE_STYLE[cat].label}
            </button>
          )
        })}
      </div>

      {/* Kaarten grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {gefilterd.map((inzicht) => (
          <InzichtKaart key={inzicht.id} inzicht={inzicht} />
        ))}
      </div>
    </div>
  )
}

// ── GebiedDetailView ──────────────────────────────────────────────────────────

// ── Section 0: Kansrijke leads ────────────────────────────────────────────────

function InfoTooltip({ storageKey, defaultQuote }: { storageKey: string; defaultQuote: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        title="Toon toelichting"
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#e2e8f0', border: 'none', cursor: 'pointer',
          fontSize: 9, fontWeight: 800, color: '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, lineHeight: 1,
        }}
      >
        i
      </button>
      {open && (
        <div
          style={{
            position: 'fixed', zIndex: 999,
            background: '#1a1a1a', color: '#e5e7eb',
            borderRadius: 8, padding: '12px 14px',
            width: 280, fontSize: 12, lineHeight: 1.7,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
            top: 'auto', left: 'auto',
            marginTop: 8,
          }}
          ref={(el) => {
            if (el) {
              const btn = el.previousElementSibling as HTMLElement
              if (btn) {
                const rect = btn.getBoundingClientRect()
                el.style.top = `${rect.bottom + 6}px`
                const left = Math.min(rect.left, window.innerWidth - 296)
                el.style.left = `${Math.max(8, left)}px`
              }
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <EditableText
            storageKey={storageKey}
            defaultValue={defaultQuote}
            tag="div"
            style={{ fontSize: 12, color: '#e5e7eb', lineHeight: 1.7, fontStyle: 'italic' }}
          />
          <div style={{ fontSize: 10, color: '#666', marginTop: 8 }}>Klik op de tekst om aan te passen</div>
        </div>
      )}
    </span>
  )
}

const TODAY = new Date('2026-04-30')

function urgentie(contractBegin: string): 'rood' | 'oranje' | 'groen' {
  const [year, month] = contractBegin.split('-').map(Number)
  // Contract loopt gemiddeld 5 jaar — einddatum = begin + 60 maanden
  const afloop = new Date(year + 5, month - 1, 1)
  const maanden = (afloop.getFullYear() - TODAY.getFullYear()) * 12 + (afloop.getMonth() - TODAY.getMonth())
  if (maanden < 12) return 'rood'
  if (maanden < 24) return 'oranje'
  return 'groen'
}

const URGENTIE_CFG = {
  rood:   { label: '< 1 jaar',   bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
  oranje: { label: '1 – 2 jaar', bg: '#fff7ed', text: '#9a3412', border: '#fdba74', dot: '#f97316' },
  groen:  { label: '> 2 jaar',   bg: '#f0fdf4', text: '#166534', border: '#86efac', dot: '#22c55e' },
}

function LeadCard({ lead, stad }: { lead: KansrijkeLead; stad?: string }) {
  const u = urgentie(lead.contractBegin)
  const cfg = URGENTIE_CFG[u]
  const [jaar, maand] = lead.contractBegin.split('-')
  const maandNamen = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
  const beginLabel = `${maandNamen[parseInt(maand) - 1]} ${jaar}`

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: `1px solid var(--c-border)`,
        borderRadius: 12,
        overflow: 'hidden',
        borderTop: `3px solid ${cfg.dot}`,
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div>
            <EditableText storageKey={`lead.${lead.id}.huurder`} defaultValue={lead.huurder} style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em', lineHeight: 1.2 }} />
            <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2 }}>
              <EditableText storageKey={`lead.${lead.id}.pandnaam`} defaultValue={lead.pandnaam} /> · <EditableText storageKey={`lead.${lead.id}.adres`} defaultValue={lead.adres} />
            </div>
          </div>
          {/* Urgentie badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 20,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              flexShrink: 0,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, whiteSpace: 'nowrap' }}>
              {cfg.label}
            </span>
          </div>
        </div>
        {/* Branche */}
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 6,
            background: '#f1f5f9',
            color: '#475569',
          }}
        >
          <EditableText storageKey={`lead.${lead.id}.branche`} defaultValue={lead.branche} />
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: lead.huurprijsPerM2 ? '1fr 1fr 1fr' : '1fr 1fr',
          background: '#faf9f7',
          borderBottom: '1px solid var(--c-border)',
        }}
      >
        {[
          { label: 'Omvang', value: `${lead.omvang} m²` },
          { label: 'Begin contract', value: beginLabel },
          ...(lead.huurprijsPerM2 ? [{ label: 'Huurprijs', value: `€${lead.huurprijsPerM2}/m²/jr` }] : []),
        ].map(({ label, value }, i) => (
          <div
            key={label}
            style={{
              padding: '8px 12px',
              borderLeft: i > 0 ? '1px solid var(--c-border)' : 'none',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              {label}
              {label === 'Begin contract' && (
                stad?.toLowerCase().includes('rotterdam')
                  ? <InfoTooltip storageKey={`lead.info.begincontract.rotterdam`} defaultQuote={`"In Rotterdam zie je vaak contracten van vijf tot zeven jaar, zeker op de Kop van Zuid. De huurder zit er lang — dus je moet er vroeg bij zijn." — Maurits de Peuteer`} />
                  : <InfoTooltip storageKey={`lead.info.begincontract.eindhoven`} defaultQuote={`"Kantoorcontracten lopen in Nederland gemiddeld vijf jaar. Dat betekent dat je als BD'er twee tot drie jaar vóór de einddatum in beeld moet zijn." — Dirk Verberne`} />
              )}
            </div>
            <EditableText storageKey={`lead.${lead.id}.stat.${label}`} defaultValue={value} style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }} />
          </div>
        ))}
      </div>

      {/* Eigenaar */}
      {lead.eigenaar && (
        <div style={{ padding: '6px 18px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
          <span style={{ fontSize: 11, color: 'var(--c-subtle)' }}>Eigenaar: </span>
          <EditableText storageKey={`lead.${lead.id}.eigenaar`} defaultValue={lead.eigenaar!} style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)' }} />
        </div>
      )}

      {/* Motivatie */}
      <div style={{ padding: '12px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)', marginBottom: 6 }}>
          Waarom kansrijk voor Ditt
        </div>
        <EditableText storageKey={`lead.${lead.id}.motivatie`} defaultValue={lead.motivatie} tag="div" style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.65 }} />
      </div>
    </div>
  )
}

function KansrijkeLeadsSection({ leads, stad }: { leads: KansrijkeLead[]; stad?: string }) {
  // Sorteren: rood eerst, dan oranje, dan groen; binnen zelfde kleur op omvang desc
  const URGENTIE_ORDER = { rood: 0, oranje: 1, groen: 2 }
  const gesorteerd = [...leads].sort((a, b) => {
    const uA = URGENTIE_ORDER[urgentie(a.contractBegin)]
    const uB = URGENTIE_ORDER[urgentie(b.contractBegin)]
    if (uA !== uB) return uA - uB
    return b.omvang - a.omvang
  })

  const counts = {
    rood:   leads.filter((l) => urgentie(l.contractBegin) === 'rood').length,
    oranje: leads.filter((l) => urgentie(l.contractBegin) === 'oranje').length,
    groen:  leads.filter((l) => urgentie(l.contractBegin) === 'groen').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Samenvatting balk */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 16px',
          background: '#faf9f7',
          borderRadius: 10,
          border: '1px solid var(--c-border)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--c-muted)', marginRight: 4 }}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''} geselecteerd
        </span>
        {(['rood', 'oranje', 'groen'] as const).map((u) => counts[u] > 0 && (
          <span
            key={u}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 20,
              background: URGENTIE_CFG[u].bg,
              color: URGENTIE_CFG[u].text,
              border: `1px solid ${URGENTIE_CFG[u].border}`,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: URGENTIE_CFG[u].dot }} />
            {counts[u]}× {URGENTIE_CFG[u].label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-subtle)' }}>
          Bron: Vastgoeddata.nl MKB-dataset · april 2026
        </span>
      </div>

      {/* Lead cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {gesorteerd.map((lead) => (
          <LeadCard key={lead.id} lead={lead} stad={stad} />
        ))}
      </div>
    </div>
  )
}

const GEBIED_STATUS_CFG: Record<GebiedStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
  'under-construction': { label: 'Under construction', dot: '○', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'in-progress':        { label: 'In progress',        dot: '◑', bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'live':               { label: 'Live',               dot: '●', bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
}

export default function GebiedDetailView() {
  const { geselecteerdGebied, geselecteerdeStad, terug } = useNavigation()
  const { getStatus } = useGebiedStatus()

  if (!geselecteerdGebied) return null

  const gebied = geselecteerdGebied
  const klasse = klasseVanGebied(gebied)
  const ks = klasse ? KLASSE_STYLE[klasse] : null
  const effectiveStatus = getStatus(gebied.id, gebied.status ?? 'live')
  const statusCfg = GEBIED_STATUS_CFG[effectiveStatus]
  const heeftPanden    = gebied.pandenInOntwikkeling.length > 0
  const heeftContacten = gebied.warmeContacten.length > 0

  // Split trends by richting for at-a-glance counts
  const trendCounts = {
    positief: gebied.trends.filter((t) => t.richting === 'positief').length,
    neutraal: gebied.trends.filter((t) => t.richting === 'neutraal').length,
    negatief: gebied.trends.filter((t) => t.richting === 'negatief').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Breadcrumb + back ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={terug}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--c-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← {geselecteerdeStad?.naam ?? 'Overzicht'}
        </button>
        <span style={{ color: 'var(--c-border)', fontSize: 16 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{gebied.naam}</span>
      </div>

      {/* ── Gebied header ── */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 16,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--c-text)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              {gebied.naam}
            </h1>
            {ks && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: ks.bg,
                  color: ks.text,
                  border: `1px solid ${ks.border}`,
                }}
              >
                {klasse}-locatie
              </span>
            )}
            {effectiveStatus !== 'live' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: statusCfg.bg,
                  color: statusCfg.text,
                  border: `1px solid ${statusCfg.border}`,
                }}
              >
                {statusCfg.dot} {statusCfg.label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>
            {geselecteerdeStad?.naam} · Peildatum {gebied.marktdata.peildatum}
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          {[
            { label: 'Leegstand',      value: `${gebied.marktdata.leegstandPercentage}%` },
            { label: 'Beschikbaar',    value: `${(gebied.marktdata.beschikbaarAanbod / 1000).toFixed(0)}k m²` },
            { label: 'In ontwikkeling', value: `${heeftPanden ? gebied.pandenInOntwikkeling.length : '—'}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)' }}>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)', marginTop: 2, letterSpacing: '-0.01em' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 0: Kansrijke leads ── */}
      {gebied.kansrijkeLeads && gebied.kansrijkeLeads.length > 0 && effectiveStatus !== 'under-construction' && (
        <Section title={`Kansrijke leads — ${gebied.kansrijkeLeads.length} geselecteerde panden`}>
          <KansrijkeLeadsSection leads={gebied.kansrijkeLeads} stad={geselecteerdeStad?.naam} />
        </Section>
      )}

      {/* ── Section 1: Gebiedskenmerken ── */}
      <Section title="Gebiedskenmerken">
        <Gebiedskenmerken gebied={gebied} />
      </Section>

      {/* ── Contactprotocol ── */}
      <ContactProtocol klasse={klasse} />

      {/* ── Section 2: Panden in ontwikkeling ── */}
      {heeftPanden && (
        <Section title={`Panden in ontwikkeling met kantoorfunctie — ${gebied.pandenInOntwikkeling.length} object${gebied.pandenInOntwikkeling.length !== 1 ? 'en' : ''}`}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {gebied.pandenInOntwikkeling.map((pand) => (
              <PandCard key={pand.id} pand={pand} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Sections 3 + 4 side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Section 3: Trends */}
        <Section
          title={`Trends — ${trendCounts.positief} positief · ${trendCounts.neutraal} neutraal · ${trendCounts.negatief} negatief`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gebied.trends.map((trend) => (
              <TrendItem key={trend.id} trend={trend} />
            ))}
            {gebied.trends.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  background: '#faf9f7',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--c-subtle)',
                  textAlign: 'center',
                  border: '1px dashed var(--c-border)',
                }}
              >
                Geen trends beschikbaar
              </div>
            )}
          </div>
        </Section>

        {/* Section 4: Interessante opdrachtgevers */}
        <Section title={`Interessante opdrachtgevers (SFO) — ${gebied.interessanteOpdrachtgevers.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {gebied.interessanteOpdrachtgevers.map((og) => (
              <OpdrachtgeverCard key={og.id} og={og} />
            ))}
            {gebied.interessanteOpdrachtgevers.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  background: '#faf9f7',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--c-subtle)',
                  textAlign: 'center',
                  border: '1px dashed var(--c-border)',
                }}
              >
                Geen opdrachtgevers vastgelegd
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ── Section 5: Warme contacten ── */}
      {heeftContacten && (
        <Section title={`Warme contacten — ${gebied.warmeContacten.length}`}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {gebied.warmeContacten.map((contact) => (
              <WarmContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Section 6: Veldonderzoek inzichten ── */}
      {gebied.inzichten.length > 0 && (
        <Section title={`Veldonderzoek — ${gebied.inzichten.length} inzicht${gebied.inzichten.length !== 1 ? 'en' : ''} uit interviews`}>
          <InzichtKaarten inzichten={gebied.inzichten} />
        </Section>
      )}
    </div>
  )
}
