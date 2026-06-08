import { useState, useEffect } from 'react'
import { useEditMode } from '../context/EditContext'
import { queueChange } from '../components/EditableText'
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
import { useViewMode } from '../context/ViewModeContext'
import { useDataOverride } from '../context/DataOverrideContext'
import EditableText from '../components/EditableText'

// ── Verwijder hulpfuncties ────────────────────────────────────────────────────

function useDeletedItems(storageKey: string) {
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

function useAddedItems<T>(storageKey: string) {
  const [items, setItems] = useState<T[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
  })
  useEffect(() => {
    function handler(e: Event) {
      const { key, value } = (e as CustomEvent<{ key: string; value: string | null }>).detail
      if (key !== storageKey) return
      try { setItems(value ? JSON.parse(value) : []) } catch {}
    }
    window.addEventListener('ditt-remote-edit', handler)
    return () => window.removeEventListener('ditt-remote-edit', handler)
  }, [storageKey])
  function addItem(item: T) {
    setItems(prev => {
      const next = [...prev, item]
      const json = JSON.stringify(next)
      localStorage.setItem(storageKey, json)
      queueChange(storageKey, json)
      return next
    })
  }
  return { items, addItem }
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
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

function nlDatum(iso: string): string {
  if (!iso) return iso
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso
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

function Section({ title, children }: { title: string; icon?: string; children: React.ReactNode }) {
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
  const { vastgoedMix: mix } = gebied
  const { getMarktdata } = useDataOverride()
  const m = getMarktdata(gebiedId, gebied.marktdata)
  const gem = ((m.huurprijsBandwidth.min + m.huurprijsBandwidth.max) / 2).toFixed(0)

  const rows = [
    { label: 'Totaal kantoor VVO',  value: fmM2(m.totaalKantoorVvo) },
    { label: 'Gem. huurprijs/m²/jr', value: m.huurprijsGemiddeld ? `€${m.huurprijsGemiddeld}` : `€${gem}` },
    { label: 'Opname 2025',        value: fmM2(m.opnameVorigeJaar) },
    { label: 'Peildatum',           value: nlDatum(m.peildatum) },
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
        {rows.map(({ label, value }, i) => (
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
            <EditableText storageKey={`gkm.${gebiedId}.${label}.value`} defaultValue={value} style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }} />
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

function PandCard({ pand, onDelete }: { pand: PandInOntwikkeling; onDelete?: () => void }) {
  const [open, setOpen] = useState(false)
  const fase = FASE_STYLE[pand.fase]

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
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
          <EditableText storageKey={`pand.${pand.id}.toelichting`} defaultValue={pand.toelichting} multiline tag="div" style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.7 }} />
        </div>
      )}
    </div>
  )
}

// ── Section 3: Trends ─────────────────────────────────────────────────────────

function TrendItem({ trend, onDelete }: { trend: Trend; onDelete?: () => void }) {
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
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
      <span style={{ fontSize: 16, color: s.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {s.icon}
      </span>
      <EditableText storageKey={`trend.${trend.id}.omschrijving`} defaultValue={trend.omschrijving} multiline tag="div" style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }} />
    </div>
  )
}

// ── Section 4: Interessante opdrachtgevers (SFO) ──────────────────────────────

function OpdrachtgeverCard({ og, onDelete }: { og: InteressanteOpdrachtgever; onDelete?: () => void }) {
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
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
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
      <EditableText storageKey={`og.${og.id}.profiel`} defaultValue={og.profiel} multiline tag="div" style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.6 }} />

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
        <EditableText storageKey={`og.${og.id}.reden`} defaultValue={og.reden} multiline tag="div" style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }} />
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

function WarmContactCard({ contact, onDelete }: { contact: WarmContact; onDelete?: () => void }) {
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
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
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
            Laatste contact: {nlDatum(contact.datumLaatsteContact)}
          </span>
        )}
      </div>

      {/* Actieknoppen,  altijd zichtbaar */}
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
        <a
          href={heeftEmail ? `mailto:${contact.email}` : undefined}
          onClick={(e) => { if (!heeftEmail) e.preventDefault(); e.stopPropagation() }}
          title={heeftEmail ? contact.email : 'E-mail onbekend'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8,
            textDecoration: 'none', transition: 'opacity 0.15s',
            background: heeftEmail ? 'var(--c-coral)' : '#fef3c7',
            border: heeftEmail ? 'none' : '1px solid #fcd34d',
            cursor: heeftEmail ? 'pointer' : 'default',
            opacity: heeftEmail ? 1 : 0.5,
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={heeftEmail ? '#fff' : '#92400e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="2,4 12,13 22,4"/>
          </svg>
        </a>
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

      {/* Notitie,  uitklapbaar */}
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
          <EditableText storageKey={`wc.${contact.id}.notitie`} defaultValue={contact.notitie} multiline tag="div" style={{ fontSize: 12, color: '#78716c', lineHeight: 1.75 }} />
        </div>
      )}
    </div>
  )
}

// ── Contactprotocol ───────────────────────────────────────────────────────────

type Product    = 'design-and-build' | 'fast-fit-out' | 'detail-and-build'

interface ProtocolInhoud {
  aanpak:   string
  kapstok:  string
}

const PRODUCTEN: { id: Product; label: string; kort: string }[] = [
  { id: 'design-and-build',  label: 'Design & Build',  kort: 'D&B'    },
  { id: 'fast-fit-out',      label: 'Fast Fit-Out',    kort: 'FFO'    },
  { id: 'detail-and-build',  label: 'Detail & Build',  kort: 'DTB'    },
]

const PARTIJ_TYPEN: { id: PartijenType; label: string }[] = [
  { id: 'makelaar', label: 'Makelaar'  },
  { id: 'eigenaar', label: 'Eigenaar'  },
  { id: 'huurder',  label: 'Huurder'   },
]

const KLASSE_AANBEVELING: Record<NonNullable<LocatieKlasse>, Product> = {
  A: 'design-and-build',
  B: 'design-and-build',
  C: 'fast-fit-out',
}

const PROTOCOL: Record<Product, Record<PartijenType, ProtocolInhoud>> = {
  'design-and-build': {
    makelaar: {
      aanpak: 'Vraag naar panden in portefeuille met verhuurleegstand of aankomende mutaties. Positioneer D&B als compleet inrichtingsconcept voor nieuwe huurders,  verhoogt aantrekkingskracht zonder risico voor de eigenaar.',
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
  'detail-and-build': {
    makelaar: {
      aanpak: 'Wanneer een huurkandidaat al een architect heeft geselecteerd, positioneer Ditt als de uitvoerende partner die het ontwerp naadloos vertaalt naar realisatie. Ditt neemt de technische uitwerking en bouw volledig over,  de architect blijft verantwoordelijk voor het ontwerp, Ditt voor de oplevering.',
      kapstok: 'Heeft u huurkandidaten die al met een eigen architect werken maar nog een betrouwbare uitvoerende partij zoeken?',
    },
    eigenaar: {
      aanpak: 'Ideaal voor objecten waarbij de huurder of eigenaar al een architectenbureau heeft geselecteerd. Ditt treedt op als uitvoerend partner en zorgt dat het ontwerp zonder vertraging en binnen budget wordt gerealiseerd,  één aanspreekpunt voor de volledige bouwfase.',
      kapstok: 'Werkt de toekomstige gebruiker van uw pand al met een architect? Dan kan Ditt de uitvoering volledig overnemen.',
    },
    huurder: {
      aanpak: 'U heeft al een architect,  Ditt zorgt dat het ontwerp ook daadwerkelijk gebouwd wordt. Van technische detaillering tot sleuteloverdracht neemt Ditt de volledige realisatie over, zodat u één aanspreekpunt heeft naast uw architect.',
      kapstok: 'Werkt u al met een architect en zoekt u een uitvoerende partij die het ontwerp feilloos en binnen planning realiseert?',
    },
  },
}

// ── Gebiedsinsteek ────────────────────────────────────────────────────────────

interface GebiedInsteek {
  karakter: string
  kansen:   string
  tipPerPartij: Partial<Record<PartijenType, string>>
}

function gebiedPrefix(id: string): string {
  if (id.startsWith('fell') || id === 'fellenoord')         return 'fellenoord'
  if (id.startsWith('cent') || id === 'centrum-eindhoven')  return 'centrum-eindhoven'
  if (id.startsWith('ss-')  || id === 'strijp-s')           return 'strijp-s'
  if (id.startsWith('kvz')  || id === 'kop-van-zuid')       return 'kop-van-Zuid'
  if (id.startsWith('rc-')  || id === 'rotterdam-centrum')  return 'rotterdam-centrum'
  if (id === 'high-tech-campus')                             return 'high-tech-campus'
  if (id === 'airport-ehv')                                  return 'airport-ehv'
  return 'generiek'
}

const GEBIED_INSTEEK: Record<string, GebiedInsteek> = {
  'fellenoord': {
    karakter: 'CBD Eindhoven,  direct bij Centraal Station, dominant zakelijke en financiële dienstverlening (ING, Rabobank, UWV). Grootschalige transformatie: Knoop XL voegt 7.500 woningen en gemengd programma toe.',
    kansen:   'Actieve verhuisbewegingen door mixed-use transformatie. Huurders zoeken kwalitatief upgrade bij contractverlenging of relocatie naar nieuwbouw in het gebied.',
    tipPerPartij: {
      makelaar: 'Vraag naar huurders met aflopend contract in de bestaande torens,  die zoeken naar upgrade óf consolidatie voor de transformatiefase.',
      eigenaar: 'Positioneer D&B als onderscheidende propositie bij transformatie naar mixed-use: ingerichte kantoorverdiepingen trekken betere huurders in een concurrerend aanbod.',
      huurder:  'Speel in op de opwaardering van het gebied: een nieuwe werkomgeving past bij de ambitie die Knoop XL uitstraalt.',
    },
  },
  'centrum-eindhoven': {
    karakter: 'Stadscentrum Eindhoven,  gemengd programma met retail, horeca en kantoren. Metz Point als ankerpunt. Relatief hoge leegstand biedt kansen voor actieve verhuurbegeleiding.',
    kansen:   'Huurders die stad-centraal willen zitten zonder campus-sfeer. Groeiende horeca en voorzieningen in omgeving maken het aantrekkelijk voor scale-ups en MKB.',
    tipPerPartij: {
      makelaar: 'Focus op MKB en scale-ups die bereikbaarheid en stadse uitstraling combineren. Positioneer Fast Fit-Out als de snelle route naar een representatief kantoor.',
      eigenaar: 'Leegstand in het centrum vraagt om onderscheidend aanbod,  een instapklaar, afgewerkt kantoor slaat aan bij de doelgroep die hier zoekt.',
      huurder:  'Benadruk de centrale ligging en de stadse beleving. Vraag naar de werkplek-identiteit die ze willen uitstralen richting medewerkers en klanten.',
    },
  },
  'strijp-s': {
    karakter: 'Voormalig Philips-complex,  creatief en innovatief district met 150.000 m² voor bedrijven, makers en onderwijs. Fase 4 in uitvoering: 8.000 m² extra kantoorruimte. BIZ actief per 2026.',
    kansen:   'Creatieve bureaus, tech scale-ups en makers zoeken hier een werkplek die bij hun identiteit past. Storytelling en uniek interieur zijn hier geen extra,  ze zijn vereist.',
    tipPerPartij: {
      makelaar: 'Strijp-S huurders zijn bewuste kopers van beleving. D&B met sterke designcomponent is hier het meest overtuigende aanbod,  positioneer dat actief.',
      eigenaar: 'Jouw pand concurreert met iconische fabrieksgebouwen. Een generiek kantoor trekt hier niemand,  investeer in identiteit en het verkoopt zichzelf.',
      huurder:  'Vraag hoe hun merk en cultuur vertaald moet worden naar de ruimte. Hier zit een huurder die weet wat ze willen,  sluit daar direct op aan.',
    },
  },
  'kop-van-Zuid': {
    karakter: 'Premium waterfront Rotterdam,  Erasmusbrug, hoog opleidings- en inkomensniveau, grotere huurders (Capabel Onderwijs 4.700 m²). Verbinding Noord-Zuid Rotterdam.',
    kansen:   'Huurders op Kop van Zuid willen representatief én duurzaam. B Corp-certificering van Ditt is hier een sterk argument. Grotere trajecten (500–2.000 m²) zijn gangbaar.',
    tipPerPartij: {
      makelaar: 'Premium locatie vraagt premium inrichting. D&B is hier het sterkste verhaal,  huurders die naar Kop van Zuid gaan, willen dat hun kantoor dat ook uitstraalt.',
      eigenaar: 'Benadruk Ditt\'s B Corp-score (89,5) en BREEAM-expertise,  duurzaamheid is hier geen checkbox maar een echte differentiator voor verhuurwaarde.',
      huurder:  'Vraag naar hun employer branding-ambitie. Een kantoor op Kop van Zuid is een statement,  de inrichting moet dat verhaal versterken.',
    },
  },
  'rotterdam-centrum': {
    karakter: 'Rotterdam Centrum en Brainpark,  divers profiel. Brainpark naast Erasmus Universiteit, financiële sector op Brainpark 2, transformatie Brainpark 1 naar wonen. Rotterdam Alexander in opkomst.',
    kansen:   'Brainpark in transitie: 90.000 m² kantoor blijft, 1.500 woningen bijgebouwd. Huurders die willen blijven, zoeken een opgewaardeerd kantoor. Alexander trekt nieuwe namen.',
    tipPerPartij: {
      makelaar: 'Brainpark-huurders zitten in een transitiegebied,  veel kantoorgebruikers heroriënteren zich. Dat is het moment om met D&B in gesprek te komen over de volgende stap.',
      eigenaar: 'Met Brainpark 1 die transformeert naar wonen wordt Brainpark 2 schaarser en waardevoller. Investeer nu in kwaliteit om de juiste huurders te trekken.',
      huurder:  'Vraag of ze al nagedacht hebben over hun plek in het veranderende Brainpark. Ditt kan helpen om hun kantoor klaar te maken voor de komende jaren.',
    },
  },
  'high-tech-campus': {
    karakter: 'Kantoorlocatie in actieve markt,  verhuisbewegingen door flight to quality en hybride werken creëren instapkansen voor Ditt.',
    kansen:   'Elk verhuismoment is een acquisitie-instapmoment. Zorg dat je vroeg in het proces zit,  vóórdat een formeel selectietraject start.',
    tipPerPartij: {
      makelaar: 'Vraag actief naar aankomende mutaties en aflopende contracten in je portefeuille.',
      eigenaar: 'Positioneer kwaliteitsverbetering als middel om de juiste huurders te trekken en te behouden.',
      huurder:  'Vraag hoe hun kantoor hun groei en cultuur weerspiegelt,  dat is het instapmoment.',
    },
  },
  'airport-ehv': {
    karakter: 'Kantoorlocatie in actieve markt,  verhuisbewegingen door flight to quality en hybride werken creëren instapkansen voor Ditt.',
    kansen:   'Elk verhuismoment is een acquisitie-instapmoment. Zorg dat je vroeg in het proces zit,  vóórdat een formeel selectietraject start.',
    tipPerPartij: {
      makelaar: 'Vraag actief naar aankomende mutaties en aflopende contracten in je portefeuille.',
      eigenaar: 'Positioneer kwaliteitsverbetering als middel om de juiste huurders te trekken en te behouden.',
      huurder:  'Vraag hoe hun kantoor hun groei en cultuur weerspiegelt,  dat is het instapmoment.',
    },
  },
  'generiek': {
    karakter: 'Kantoorlocatie in actieve markt,  verhuisbewegingen door flight to quality en hybride werken creëren instapkansen voor Ditt.',
    kansen:   'Elk verhuismoment is een acquisitie-instapmoment. Zorg dat je vroeg in het proces zit,  vóórdat een formeel selectietraject start.',
    tipPerPartij: {
      makelaar: 'Vraag actief naar aankomende mutaties en aflopende contracten in je portefeuille.',
      eigenaar: 'Benadruk dat een instapklaar kantoor de verhuursnelheid verhoogt en betere huurders trekt.',
      huurder:  'Sluit aan op hun urgentie,  tijdsplanning en budget zijn de twee knoppen waarop Ditt het verschil maakt.',
    },
  },
}

// ── Aanbevolen slides per product + partijtype ─────────────────────────────

interface SlideRef { nr: number; omschrijving: string }

const AANBEVOLEN_SLIDES: Record<Product, Record<PartijenType, SlideRef[]>> = {
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
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 19, omschrijving: 'Missie & Visie,  een partner op wie je kunt bouwen' },
      { nr: 36, omschrijving: 'Client Portal,  transparantie tijdens het project' },
      { nr: 45, omschrijving: 'The Office Lifecycle,  jij staat centraal in elk fase' },
      { nr: 54, omschrijving: 'Organogram D&B,  één aanspreekpunt, volledig ontzorgd' },
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
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 31, omschrijving: 'Diensten,  Fast Fit-Out: functioneel en aantrekkelijk' },
      { nr: 36, omschrijving: 'Client Portal,  realtime inzicht in voortgang' },
      { nr: 99, omschrijving: 'Planningsoverzicht,  wanneer zit je erin?' },
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
    huurder: [
      { nr: 17, omschrijving: 'Bedrijfsintro,  Great Offices, Happy People' },
      { nr: 36, omschrijving: 'Client Portal,  jij en je architect blijven altijd op de hoogte' },
      { nr: 54, omschrijving: 'D&B organogram,  duidelijke rolverdeling architect / Ditt' },
      { nr: 40, omschrijving: 'Waarom Ditt?,  VCA gecertificeerd, betrouwbaar' },
    ],
  },
}

// ── Elevator pitch ─────────────────────────────────────────────────────────

const ELEVATOR_PITCH =
  'Ditt Officemakers is design & build specialist voor kantoorwerkomgevingen,  van schets tot sleuteloverdracht. ' +
  'Wij zijn B Corp gecertificeerd (score 89,5), werken met 65+ specialisten en zetten onze eigen AI-tool in om ' +
  'plattegronden snel in kaart te brengen. Of het nu gaat om een volledig Design & Build traject, een snelle ' +
  'Fast Fit-Out of Detail & Build met een externe architect,  wij zorgen dat het kantoor klaar is op tijd, ' +
  'binnen budget en met een resultaat waar mensen blij van worden.'

function ContactProtocol({ klasse, gebiedId, stadNaam }: { klasse: LocatieKlasse; gebiedId: string; stadNaam: string }) {
  const aanbevolen = klasse ? KLASSE_AANBEVELING[klasse] : null
  const [product, setProduct]     = useState<Product>(aanbevolen ?? 'design-and-build')
  const [partijType, setPartijType] = useState<PartijenType>('makelaar')
  const [toonPitch, setToonPitch]  = useState(false)

  const inhoud   = PROTOCOL[product][partijType]
  const prefix   = gebiedPrefix(gebiedId)
  const insteek  = GEBIED_INSTEEK[prefix] ?? GEBIED_INSTEEK['generiek']
  const slides   = AANBEVOLEN_SLIDES[product][partijType]
  const partijTip = insteek.tipPerPartij[partijType]

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

      {/* Gebiedsinsteek */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', background: '#faf9f7', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)' }}>
          Gebiedsprofiel,  {stadNaam}
        </div>
        <EditableText
          storageKey={`insteek.${prefix}.karakter`}
          defaultValue={insteek.karakter}
          tag="div"
          multiline
          style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.65 }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-coral)', whiteSpace: 'nowrap', paddingTop: 1 }}>
            Tip →
          </span>
          <EditableText
            key={`insteek.${prefix}.tip.${partijType}`}
            storageKey={`insteek.${prefix}.tip.${partijType}`}
            defaultValue={partijTip ?? insteek.kansen}
            tag="div"
            multiline
            style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.65 }}
          />
        </div>
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

      {/* Aanbevolen slides + elevator pitch */}
      <div style={{ borderTop: '1px solid var(--c-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* Aanbevolen slides */}
        <div style={{ padding: '18px 20px', borderRight: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 10 }}>
            Aanbevolen slides (PPT)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {slides.map((s) => (
              <div key={s.nr} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--c-coral)', borderRadius: 4, padding: '1px 6px', minWidth: 28, textAlign: 'center', flexShrink: 0 }}>
                  {s.nr}
                </span>
                <span style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.5 }}>{s.omschrijving}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Elevator pitch */}
        <div style={{ padding: '18px 20px' }}>
          <button
            onClick={() => setToonPitch(!toonPitch)}
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Elevator pitch {toonPitch ? '▲' : '▼'}
          </button>
          {toonPitch && (
            <EditableText
              storageKey="elevator_pitch"
              defaultValue={ELEVATOR_PITCH}
              tag="p"
              multiline
              style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.7, margin: 0 }}
            />
          )}
          {!toonPitch && (
            <p style={{ fontSize: 12, color: 'var(--c-subtle)', margin: 0, fontStyle: 'italic' }}>
              Klik om de standaard Ditt-pitch te tonen.
            </p>
          )}
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

function InzichtKaart({ inzicht, onDelete }: { inzicht: InterviewInzicht; onDelete?: () => void }) {
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
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
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
  const { deleted, deleteItem } = useDeletedItems('deleted_inzichten')

  const zichtbaar = inzichten.filter((i) => !deleted.has(i.id))
  const categorieën = ['alle', ...Array.from(new Set(zichtbaar.map((i) => i.categorie)))] as (InzichtCategorie | 'alle')[]
  const gefilterd = actief === 'alle' ? zichtbaar : zichtbaar.filter((i) => i.categorie === actief)

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
              {isAlle ? `Alle (${zichtbaar.length})` : CATEGORIE_STYLE[cat].label}
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
          <InzichtKaart key={inzicht.id} inzicht={inzicht} onDelete={() => deleteItem(inzicht.id)} />
        ))}
      </div>
    </div>
  )
}

// ── GebiedDetailView ──────────────────────────────────────────────────────────

// ── Begrotingsberekening (gedeeld met StadOverzichtView) ──────────────────────

const LEAD_FITOUT_TABLE: Record<string, Record<string, number>> = {
  Open:        { Low: 350, Mid: 500, High: 700 },
  Hybrid:      { Low: 450, Mid: 600, High: 800 },
  Traditional: { Low: 550, Mid: 700, High: 900 },
}
const LEAD_FURNITURE_TABLE: Record<string, number> = { Low: 250, Mid: 325, High: 400 }
const LEAD_IDENTITY_TABLE:  Record<string, number>  = { Low: 50,  Mid: 75,  High: 100 }
const LEAD_MEP_OPTIES = [
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

function calcLeadBegroting(m2: number, type: string, fitout: string, furn: string, ident: string, mep: number) {
  const fp = LEAD_FITOUT_TABLE[type][fitout]
  const up = LEAD_FURNITURE_TABLE[furn]
  const ip = LEAD_IDENTITY_TABLE[ident]
  const f  = 1 / 1.04
  const inv_f  = fp  * m2 * f
  const inv_u  = up  * m2 * f
  const inv_i  = ip  * m2 * f
  const inv_m  = mep * m2 * f
  const sub    = inv_f + inv_u + inv_i + inv_m
  const inv_bp = sub * 0.04
  const total  = sub + inv_bp
  const inkoop = inv_f * 0.65 + inv_u * 0.65 + inv_i * 0.65 + inv_m * 0.90 + inv_bp * 0.65
  return { total, inkoop, marge: total > 0 ? (total - inkoop) / total : 0, per_m2: total / m2 }
}

function fmK(n: number) {
  return n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${Math.round(n).toLocaleString('nl-NL')}`
}

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
  // Contract loopt gemiddeld 5 jaar,  einddatum = begin + 60 maanden
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

const SEL_STYLE: React.CSSProperties = {
  fontSize: 11, padding: '3px 6px',
  border: '1px solid var(--c-border)', borderRadius: 5,
  background: 'var(--c-surface)', color: 'var(--c-text)', cursor: 'pointer',
}

function LeadCard({ lead, stad, onDelete }: { lead: KansrijkeLead; stad?: string; onDelete?: () => void }) {
  const u = urgentie(lead.contractBegin)
  const cfg = URGENTIE_CFG[u]
  const [jaar, maand] = lead.contractBegin.split('-')
  const [showBegroting, setShowBegroting] = useState(false)
  const [bType,  setBType]  = useState('Hybrid')
  const [bFit,   setBFit]   = useState('Mid')
  const [bFurn,  setBFurn]  = useState('Mid')
  const [bIdent, setBIdent] = useState('Mid')
  const [bMep,   setBMep]   = useState(350)
  const calc = calcLeadBegroting(lead.omvang, bType, bFit, bFurn, bIdent, bMep)
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
        position: 'relative',
      }}
    >
      <DeleteBtn onDelete={onDelete ?? (() => {})} />
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
        {/* Branche + MKB badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
          {lead.omvang < 500 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af' }}>
              MKB
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: '#faf9f7',
          borderBottom: '1px solid var(--c-border)',
        }}
      >
        {[
          { label: 'Omvang', value: `${lead.omvang} m²` },
          { label: 'Begin contract', value: beginLabel },
          { label: 'Huurprijs', value: lead.huurprijsPerM2 ? `€${lead.huurprijsPerM2}/m²/jr` : ', ' },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            style={{
              padding: '10px 12px',
              borderLeft: i > 0 ? '1px solid var(--c-border)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              {label}
              {label === 'Begin contract' && (
                stad?.toLowerCase().includes('rotterdam')
                  ? <InfoTooltip storageKey={`lead.info.begincontract.rotterdam`} defaultQuote={`"In Rotterdam zie je vaak contracten van vijf tot zeven jaar, zeker op de Kop van Zuid. De huurder zit er lang,  dus je moet er vroeg bij zijn.",  Maurits de Peuteer`} />
                  : <InfoTooltip storageKey={`lead.info.begincontract.eindhoven`} defaultQuote={`"Kantoorcontracten lopen in Nederland gemiddeld vijf jaar. Dat betekent dat je als BD'er twee tot drie jaar vóór de einddatum in beeld moet zijn.",  Dirk Verberne`} />
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
        <EditableText storageKey={`lead.${lead.id}.motivatie`} defaultValue={lead.motivatie} multiline tag="div" style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.65 }} />
      </div>

      {/* Begrotingsindcatie toggle */}
      <div style={{ borderTop: '1px solid var(--c-border)' }}>
        <button
          onClick={() => setShowBegroting((o) => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, color: '#6366f1',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}
        >
          <span>Begrotingsindicatie</span>
          <span style={{ transform: showBegroting ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', fontSize: 14 }}>↓</span>
        </button>

        {showBegroting && (
          <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)' }}>Type</span>
                <select style={SEL_STYLE} value={bType} onChange={(e) => setBType(e.target.value)}>
                  {['Open', 'Hybrid', 'Traditional'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)' }}>Fitout</span>
                <select style={SEL_STYLE} value={bFit} onChange={(e) => setBFit(e.target.value)}>
                  {['Low', 'Mid', 'High'].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)' }}>Furniture</span>
                <select style={SEL_STYLE} value={bFurn} onChange={(e) => setBFurn(e.target.value)}>
                  {['Low', 'Mid', 'High'].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)' }}>Identity</span>
                <select style={SEL_STYLE} value={bIdent} onChange={(e) => setBIdent(e.target.value)}>
                  {['Low', 'Mid', 'High'].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-subtle)' }}>Installaties</span>
                <select style={SEL_STYLE} value={bMep} onChange={(e) => setBMep(Number(e.target.value))}>
                  {LEAD_MEP_OPTIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Resultaat */}
            <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Investering</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{fmK(calc.total)}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>€{Math.round(calc.per_m2).toLocaleString('nl-NL')}/m²</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Inkoop</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{fmK(calc.inkoop)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Marge</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{(calc.marge * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--c-subtle)' }}>
              {lead.omvang} m² · Begrotingssheet 2026 Premium · bouwplaats 4% inbegrepen
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KansrijkeLeadsSection({ leads, stad }: { leads: KansrijkeLead[]; stad?: string }) {
  const { deleted, deleteItem } = useDeletedItems('deleted_leads')
  const zichtbaar = leads.filter((l) => !deleted.has(l.id))

  // Sorteren: rood eerst, dan oranje, dan groen; binnen zelfde kleur op omvang desc
  const URGENTIE_ORDER = { rood: 0, oranje: 1, groen: 2 }
  const gesorteerd = [...zichtbaar].sort((a, b) => {
    const uA = URGENTIE_ORDER[urgentie(a.contractBegin)]
    const uB = URGENTIE_ORDER[urgentie(b.contractBegin)]
    if (uA !== uB) return uA - uB
    return b.omvang - a.omvang
  })

  const counts = {
    rood:   zichtbaar.filter((l) => urgentie(l.contractBegin) === 'rood').length,
    oranje: zichtbaar.filter((l) => urgentie(l.contractBegin) === 'oranje').length,
    groen:  zichtbaar.filter((l) => urgentie(l.contractBegin) === 'groen').length,
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
          {leads.length} aflopend{leads.length !== 1 ? 'e contracten' : ' contract'}
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
          <LeadCard key={lead.id} lead={lead} stad={stad} onDelete={() => deleteItem(lead.id)} />
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
  const { viewMode } = useViewMode()
  const { isEditMode } = useEditMode()

  if (!geselecteerdGebied) return null

  const gebied = geselecteerdGebied
  const klasse = klasseVanGebied(gebied)
  const ks = klasse ? KLASSE_STYLE[klasse] : null
  const effectiveStatus = getStatus(gebied.id, gebied.status ?? 'live')
  const statusCfg = GEBIED_STATUS_CFG[effectiveStatus]
  const { deleted: deletedPanden,    deleteItem: deletePand }    = useDeletedItems('deleted_panden')
  const { deleted: deletedTrends,    deleteItem: deleteTrend }   = useDeletedItems('deleted_trends')
  const { deleted: deletedOg,        deleteItem: deleteOg }      = useDeletedItems('deleted_og')
  const { deleted: deletedContacten, deleteItem: deleteContact } = useDeletedItems('deleted_wc')
  const { items: addedTrends,    addItem: addTrend }   = useAddedItems<Trend>(`added_trends_${gebied.id}`)
  const { items: addedContacten, addItem: addContact } = useAddedItems<WarmContact>(`added_wc_${gebied.id}`)
  const { items: addedLeads,     addItem: addLead }    = useAddedItems<KansrijkeLead>(`added_leads_${gebied.id}`)
  const { items: addedOg,        addItem: addOg }      = useAddedItems<InteressanteOpdrachtgever>(`added_og_${gebied.id}`)
  const { items: addedPanden,    addItem: addPand }    = useAddedItems<PandInOntwikkeling>(`added_panden_${gebied.id}`)
  const alleLeads  = [...(gebied.kansrijkeLeads ?? []), ...addedLeads]

  const zichtbarePanden    = [...gebied.pandenInOntwikkeling, ...addedPanden].filter((p) => !deletedPanden.has(p.id))
  const zichtbareTrends    = [...gebied.trends, ...addedTrends].filter((t) => !deletedTrends.has(t.id))
  const zichtbareOg        = [...gebied.interessanteOpdrachtgevers, ...addedOg].filter((o) => !deletedOg.has(o.id))
  const zichtbareContacten = [...gebied.warmeContacten, ...addedContacten].filter((c) => !deletedContacten.has(c.id))

  const heeftPanden    = zichtbarePanden.length > 0
  const heeftContacten = zichtbareContacten.length > 0

  // Split trends by richting for at-a-glance counts
  const trendCounts = {
    positief: zichtbareTrends.filter((t) => t.richting === 'positief').length,
    neutraal: zichtbareTrends.filter((t) => t.richting === 'neutraal').length,
    negatief: zichtbareTrends.filter((t) => t.richting === 'negatief').length,
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
          <EditableText storageKey={`gebied.${gebied.id}.naam`} defaultValue={gebied.naam || 'Naamloos gebied'} />
        </span>
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
              <EditableText storageKey={`gebied.${gebied.id}.naam`} defaultValue={gebied.naam || 'Naamloos gebied'} />
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
            {geselecteerdeStad?.naam} · Peildatum {nlDatum(gebied.marktdata.peildatum)}
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          {[
            { label: 'In ontwikkeling', value: `${heeftPanden ? gebied.pandenInOntwikkeling.length : ', '}` },
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

      {/* ── INFORMATIE weergave ── */}
      {viewMode === 'informatie' && (
        <>
          {/* Kansrijke leads / Aflopende contracten */}
          {(alleLeads.length > 0 || isEditMode) && (effectiveStatus !== 'under-construction' || isEditMode) && (
            <Section title={`Aflopende contracten,  ${alleLeads.length} pand${alleLeads.length !== 1 ? 'en' : ''}`}>
              <KansrijkeLeadsSection leads={alleLeads} stad={geselecteerdeStad?.naam} />
              {isEditMode && (
                <button
                  onClick={() => addLead({
                    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    pandnaam: 'Pandnaam...', adres: 'Adres...', huurder: 'Huurder...',
                    branche: 'Branche...', omvang: 0, contractBegin: new Date().toISOString().slice(0, 7),
                    motivatie: 'Motivatie...',
                  })}
                  style={{
                    marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--c-border)',
                    background: 'transparent', color: 'var(--c-muted)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  + Aflopend contract toevoegen
                </button>
              )}
            </Section>
          )}

          {/* Gebiedskenmerken */}
          <Section title="Gebiedskenmerken">
            <Gebiedskenmerken gebied={gebied} />
          </Section>

          {/* Panden in ontwikkeling */}
          {(heeftPanden || isEditMode) && (
            <Section title={`Panden in ontwikkeling met kantoorfunctie,  ${zichtbarePanden.length} object${zichtbarePanden.length !== 1 ? 'en' : ''}`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {zichtbarePanden.map((pand) => (
                  <PandCard key={pand.id} pand={pand} onDelete={() => deletePand(pand.id)} />
                ))}
                {isEditMode && (
                  <button
                    onClick={() => addPand({
                      id: `pand-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      naam: 'Pandnaam...', adres: 'Adres...', oppervlakte: 0,
                      fase: 'planfase', verwachteOplevering: 'Q4 2026',
                      toelichting: 'Toelichting...',
                    })}
                    style={{
                      minHeight: 120, borderRadius: 12, border: '1px dashed var(--c-border)',
                      background: '#faf9f7', color: 'var(--c-muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    + Pand toevoegen
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Trends + Opdrachtgevers side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Section title={`Trends,  ${trendCounts.positief} positief · ${trendCounts.neutraal} neutraal · ${trendCounts.negatief} negatief`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {zichtbareTrends.map((trend) => (
                  <TrendItem key={trend.id} trend={trend} onDelete={() => deleteTrend(trend.id)} />
                ))}
                {zichtbareTrends.length === 0 && (
                  <div style={{ padding: '20px', background: '#faf9f7', borderRadius: 10, fontSize: 12, color: 'var(--c-subtle)', textAlign: 'center', border: '1px dashed var(--c-border)' }}>
                    Geen trends beschikbaar
                  </div>
                )}
                {isEditMode && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {([
                      { r: 'positief' as TrendRichting, label: '+ Positief', color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
                      { r: 'neutraal' as TrendRichting, label: '+ Neutraal', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
                      { r: 'negatief' as TrendRichting, label: '+ Negatief', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
                    ]).map(({ r, label, color, bg, border }) => (
                      <button
                        key={r}
                        onClick={() => addTrend({
                          id: `trend-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                          richting: r,
                          omschrijving: 'Nieuwe trend...',
                        })}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 7,
                          border: `1px dashed ${border}`, background: bg,
                          color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section title={`Interessante opdrachtgevers (SFO),  ${zichtbareOg.length}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {zichtbareOg.map((og) => (
                  <OpdrachtgeverCard key={og.id} og={og} onDelete={() => deleteOg(og.id)} />
                ))}
                {zichtbareOg.length === 0 && (
                  <div style={{ padding: '20px', background: '#faf9f7', borderRadius: 10, fontSize: 12, color: 'var(--c-subtle)', textAlign: 'center', border: '1px dashed var(--c-border)' }}>
                    Geen opdrachtgevers vastgelegd
                  </div>
                )}
                {isEditMode && (
                  <button
                    onClick={() => addOg({
                      id: `og-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      naam: 'Bedrijfsnaam...', sector: 'Sector...',
                      profiel: 'Profiel...', reden: 'Waarom interessant voor Ditt...',
                      status: 'prospect',
                    })}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--c-border)',
                      background: 'transparent', color: 'var(--c-muted)', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', width: '100%',
                    }}
                  >
                    + Opdrachtgever toevoegen
                  </button>
                )}
              </div>
            </Section>
          </div>
        </>
      )}

      {/* ── ACTIE weergave ── */}
      {viewMode === 'actie' && (
        <>
          {/* Contactprotocol */}
          <ContactProtocol klasse={klasse} gebiedId={gebied.id} stadNaam={geselecteerdeStad?.naam ?? ''} />

          {/* Warme contacten */}
          {(heeftContacten || isEditMode) && (
            <Section title={`Warme contacten,  ${zichtbareContacten.length}`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {zichtbareContacten.map((contact) => (
                  <WarmContactCard key={contact.id} contact={contact} onDelete={() => deleteContact(contact.id)} />
                ))}
                {isEditMode && (
                  <button
                    onClick={() => addContact({
                      id: `wc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      naam: 'Naam...', organisatie: 'Organisatie...', rol: 'Rol...',
                      email: '', telefoon: '', datumLaatsteContact: '', notitie: '',
                    })}
                    style={{
                      minHeight: 120, borderRadius: 12, border: '1px dashed #fcd34d',
                      background: 'rgba(253,211,77,0.07)', color: '#d97706',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    + Warm contact toevoegen
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Veldonderzoek inzichten */}
          {gebied.inzichten.length > 0 && (
            <Section title={`Veldonderzoek,  ${gebied.inzichten.length} inzicht${gebied.inzichten.length !== 1 ? 'en' : ''} uit interviews`}>
              <InzichtKaarten inzichten={gebied.inzichten} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}
