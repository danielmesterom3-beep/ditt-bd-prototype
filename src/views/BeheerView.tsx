import { useState } from 'react'
import { useAllSteden } from '../context/CustomStedenContext'
import { useGebiedStatus } from '../context/GebiedStatusContext'
import { useEditMode } from '../context/EditContext'
import type { GebiedStatus } from '../data/types'

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GebiedStatus, { label: string; bg: string; text: string; border: string }> = {
  'under-construction': { label: 'Under construction', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'in-progress':        { label: 'In progress',        bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'live':               { label: 'Live',               bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
}

const STATUS_ORDER: GebiedStatus[] = ['under-construction', 'in-progress', 'live']


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


// ── BeheerView ────────────────────────────────────────────────────────────────

export default function BeheerView() {
  const { allSteden: steden, customSteden, addStad, removeStad, addGebied, removeGebied, isExtraGebied } = useAllSteden()
  const { getStatus, setStatus, overrides } = useGebiedStatus()
  const { changePin } = useEditMode()
  const [stadAanmakenOpen, setStadAanmakenOpen] = useState(false)
  const [nieuwStadNaam, setNieuwStadNaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [nieuwGebiedStad, setNieuwGebiedStad] = useState<string | null>(null)
  const [nieuwGebiedNaam, setNieuwGebiedNaam] = useState('')
  const [gebiedBezig, setGebiedBezig] = useState(false)

  // PIN wijzigen
  const [pinForm, setPinForm] = useState({ huidig: '', nieuw: '', bevestig: '' })
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; tekst: string } | null>(null)
  const [pinBezig, setPinBezig] = useState(false)

  async function handlePinWijzigen(e: React.FormEvent) {
    e.preventDefault()
    if (pinForm.nieuw !== pinForm.bevestig) {
      setPinMsg({ ok: false, tekst: 'Nieuw wachtwoord en bevestiging komen niet overeen.' })
      return
    }
    setPinBezig(true)
    const result = await changePin(pinForm.huidig, pinForm.nieuw)
    setPinBezig(false)
    if (result.ok) {
      setPinMsg({ ok: true, tekst: 'Wachtwoord gewijzigd. Alle gebruikers moeten opnieuw inloggen.' })
      setPinForm({ huidig: '', nieuw: '', bevestig: '' })
    } else {
      setPinMsg({ ok: false, tekst: result.fout ?? 'Onbekende fout.' })
    }
  }

  async function handleStadAanmaken() {
    const naam = nieuwStadNaam.trim()
    if (!naam) return
    setBezig(true)
    await addStad(naam)
    setNieuwStadNaam('')
    setBezig(false)
  }

  async function handleGebiedAanmaken(stadId: string) {
    const naam = nieuwGebiedNaam.trim()
    if (!naam) return
    setGebiedBezig(true)
    await addGebied(stadId, naam)
    setNieuwGebiedNaam('')
    setNieuwGebiedStad(null)
    setGebiedBezig(false)
  }

  async function handleGebiedVerwijderen(stadId: string, gebiedId: string, gebiedNaam: string, isLaatste: boolean) {
    const isStatisch = !customSteden.some((s) => s.id === stadId)
    const waarschuwing = isLaatste && isStatisch
      ? `Dit is het laatste gebied van deze stad. Weet je zeker dat je "${gebiedNaam || gebiedId}" wilt verwijderen?`
      : `Gebied "${gebiedNaam || gebiedId}" definitief verwijderen?`
    if (!window.confirm(waarschuwing)) return
    await removeGebied(stadId, gebiedId)
  }

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
                {stad.gebieden.length === 0 && (
                  <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--c-subtle)', fontStyle: 'italic' }}>
                    Geen gebieden — voeg er een toe via de + knop.
                  </div>
                )}
                {stad.gebieden.map((gebied, i) => {
                  const effectiveStatus = getStatus(gebied.id, gebied.status ?? 'live')
                  const isLast = i === stad.gebieden.length - 1
                  const kanVerwijderen = isExtraGebied(stad.id, gebied.id)
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
                          {gebied.naam || <span style={{ color: 'var(--c-subtle)', fontStyle: 'italic' }}>Naamloos gebied</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
                          {gebied.id}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <StatusBadge status={effectiveStatus} />
                        <StatusCycleButton gebiedId={gebied.id} currentStatus={effectiveStatus} />
                        {gebied.id in overrides && (
                          <button
                            onClick={() => setStatus(gebied.id, gebied.status ?? 'live')}
                            title="Reset naar standaard"
                            style={{
                              fontSize: 11, padding: '3px 8px', borderRadius: 20,
                              background: 'transparent', color: '#dc2626',
                              border: '1px solid #fca5a5', cursor: 'pointer',
                            }}
                          >
                            Reset
                          </button>
                        )}
                        {kanVerwijderen && (
                          <button
                            onClick={() => handleGebiedVerwijderen(stad.id, gebied.id, gebied.naam, stad.gebieden.length === 1)}
                            title="Gebied verwijderen"
                            style={{
                              fontSize: 13, width: 24, height: 24, borderRadius: 6,
                              background: 'transparent', color: '#9ca3af',
                              border: '1px solid #e2e8f0', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Nieuw gebied toevoegen */}
                {nieuwGebiedStad === stad.id ? (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      type="text"
                      value={nieuwGebiedNaam}
                      onChange={(e) => setNieuwGebiedNaam(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGebiedAanmaken(stad.id)
                        if (e.key === 'Escape') { setNieuwGebiedStad(null); setNieuwGebiedNaam('') }
                      }}
                      placeholder="Gebiedsnaam, bijv. Centrum"
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: 7,
                        border: '1px solid var(--c-border)', background: '#faf9f7',
                        fontSize: 12, color: 'var(--c-text)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleGebiedAanmaken(stad.id)}
                      disabled={!nieuwGebiedNaam.trim() || gebiedBezig}
                      style={{
                        padding: '7px 14px', borderRadius: 7, border: 'none',
                        background: nieuwGebiedNaam.trim() ? '#ff7f50' : '#e5e7eb',
                        color: nieuwGebiedNaam.trim() ? '#fff' : '#9ca3af',
                        fontSize: 12, fontWeight: 600, cursor: nieuwGebiedNaam.trim() ? 'pointer' : 'default',
                      }}
                    >
                      {gebiedBezig ? '...' : 'Aanmaken'}
                    </button>
                    <button
                      onClick={() => { setNieuwGebiedStad(null); setNieuwGebiedNaam('') }}
                      style={{
                        padding: '7px 10px', borderRadius: 7,
                        border: '1px solid var(--c-border)', background: 'none',
                        fontSize: 12, color: 'var(--c-muted)', cursor: 'pointer',
                      }}
                    >
                      Annuleer
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '10px 20px', borderTop: '1px solid var(--c-border)' }}>
                    <button
                      onClick={() => { setNieuwGebiedStad(stad.id); setNieuwGebiedNaam('') }}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7,
                        background: 'none', color: 'var(--c-coral)',
                        border: '1px dashed var(--c-coral)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      + Gebied toevoegen
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sectie 3: Stad aanmaken ── */}
      <div>
        <button
          onClick={() => setStadAanmakenOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            borderRadius: stadAanmakenOpen ? '12px 12px 0 0' : 12,
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)' }}>
              Stad aanmaken
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>
              Voeg een nieuwe stad toe met een leeg template,  zichtbaar voor alle gebruikers
            </div>
          </div>
          <span style={{ fontSize: 16, color: 'var(--c-subtle)', transform: stadAanmakenOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            ↓
          </span>
        </button>

        {stadAanmakenOpen && (
          <div
            style={{
              border: '1px solid var(--c-border)',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '20px 18px',
              background: 'var(--c-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Invoer nieuwe stad */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={nieuwStadNaam}
                onChange={(e) => setNieuwStadNaam(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleStadAanmaken() }}
                placeholder="Stadsnaam, bijv. Utrecht"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--c-border)',
                  background: '#faf9f7',
                  fontSize: 13,
                  color: 'var(--c-text)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleStadAanmaken}
                disabled={!nieuwStadNaam.trim() || bezig}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: nieuwStadNaam.trim() ? '#ff7f50' : '#e5e7eb',
                  color: nieuwStadNaam.trim() ? '#fff' : '#9ca3af',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: nieuwStadNaam.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {bezig ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.6 }}>
              Nieuwe stad start met status <strong>Under construction</strong> en één leeg gebied "Centrum [Stadsnaam]".
              Bewerk daarna de inhoud via bewerkingsmodus.
            </div>
          </div>
        )}
      </div>

      {/* ── Aangemaakte steden,  altijd zichtbaar ── */}
      {customSteden.length > 0 && (
        <div
          style={{
            border: '1px solid var(--c-border)',
            borderRadius: 12,
            background: 'var(--c-surface)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--c-border)', background: '#faf9f7' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)' }}>
              Aangemaakte steden
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {customSteden.map((stad, i) => (
              <div
                key={stad.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderTop: i > 0 ? '1px solid var(--c-border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{stad.naam}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-subtle)' }}>{stad.gebieden.length} gebied{stad.gebieden.length !== 1 ? 'en' : ''}</div>
                </div>
                <button
                  onClick={() => { if (window.confirm(`Stad "${stad.naam}" definitief verwijderen?`)) removeStad(stad.id) }}
                  style={{
                    fontSize: 11, padding: '4px 12px', borderRadius: 20,
                    background: 'transparent', color: '#dc2626',
                    border: '1px solid #fca5a5', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Wachtwoord wijzigen ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-subtle)', marginBottom: 14 }}>
          Bewerkingsmodus · wachtwoord
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: '#faf9f7', borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>Wachtwoord wijzigen</div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 3 }}>
              Sla het nieuwe wachtwoord op een veilige plek op en deel het met je team. Wijziging is direct actief voor alle gebruikers.
            </div>
          </div>
          <form onSubmit={handlePinWijzigen} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-subtle)', display: 'block', marginBottom: 4 }}>Huidig wachtwoord</label>
                <input
                  type="password"
                  required
                  value={pinForm.huidig}
                  onChange={e => { setPinForm(f => ({ ...f, huidig: e.target.value })); setPinMsg(null) }}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--c-border)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-subtle)', display: 'block', marginBottom: 4 }}>Nieuw wachtwoord</label>
                <input
                  type="password"
                  required
                  value={pinForm.nieuw}
                  onChange={e => { setPinForm(f => ({ ...f, nieuw: e.target.value })); setPinMsg(null) }}
                  placeholder="Minimaal 4 tekens"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--c-border)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-subtle)', display: 'block', marginBottom: 4 }}>Bevestig nieuw</label>
                <input
                  type="password"
                  required
                  value={pinForm.bevestig}
                  onChange={e => { setPinForm(f => ({ ...f, bevestig: e.target.value })); setPinMsg(null) }}
                  placeholder="Herhaal wachtwoord"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--c-border)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            {pinMsg && (
              <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: pinMsg.ok ? '#f0fdf4' : '#fef2f2', color: pinMsg.ok ? '#15803d' : '#dc2626', border: `1px solid ${pinMsg.ok ? '#bbf7d0' : '#fecaca'}` }}>
                {pinMsg.ok ? '✓ ' : '✗ '}{pinMsg.tekst}
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={!pinForm.huidig || !pinForm.nieuw || !pinForm.bevestig || pinBezig}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: (!pinForm.huidig || !pinForm.nieuw || !pinForm.bevestig || pinBezig) ? 'default' : 'pointer', background: (!pinForm.huidig || !pinForm.nieuw || !pinForm.bevestig || pinBezig) ? '#e5e7eb' : '#ff7f50', color: (!pinForm.huidig || !pinForm.nieuw || !pinForm.bevestig || pinBezig) ? '#9ca3af' : '#fff' }}
              >
                {pinBezig ? 'Opslaan…' : 'Wachtwoord wijzigen'}
              </button>
            </div>
          </form>
        </div>
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
        Alle wijzigingen worden opgeslagen in Supabase en direct gesynchroniseerd naar alle gebruikers.
      </div>
    </div>
  )
}
