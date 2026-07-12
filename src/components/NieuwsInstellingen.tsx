import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useEditMode } from '../context/EditContext'
import { useAllSteden } from '../context/CustomStedenContext'
import { STEDEN } from '../config/steden'

// ── Defaults (fallback als Supabase leeg is) ────────────────────────────────

export interface Bron {
  id: string
  naam: string
  url: string
  actief: boolean
}

export interface NieuwsFilters {
  kantoor: string[]
  uitsluit: string[]
}

export const DEFAULT_BRONNEN: Bron[] = [
  { id: 'vj', naam: 'Vastgoedjournaal', url: 'https://vastgoedjournaal.nl/news/rss',  actief: true },
  { id: 'va', naam: 'Vastgoed Actueel',  url: 'https://vastgoedactueel.nl/feed/',      actief: true },
]

export const DEFAULT_KANTOOR_TERMEN: string[] = [
  'kantoor', 'kantoren', 'office', 'werkplek', 'werkomgeving',
  'verhuur', 'verhuurd', 'huurder', 'huurovereenkomst',
  'eigenaar', 'belegger', 'vastgoedbelegger', 'asset manager',
  'makelaar', 'transactie', 'aankoop', 'verkoop', 'opname',
  'leegstand', 'bezettingsgraad', 'm²', 'm2', 'vierkante meter',
  'herontwikkeling', 'renovatie', 'transformatie', 'oplevering',
  'inrichting', 'design build', 'interieur', 'fit-out', 'verbouwing',
  'commercieel vastgoed', 'bedrijfsruimte',
]

export const DEFAULT_UITSLUIT_TERMEN: string[] = [
  'woning', 'woningen', 'woningbouw', 'woningmarkt', 'koopwoning', 'huurwoning',
  'sociale huur', 'hypotheek', 'huizenprijs', 'eengezins', 'corporatie',
  'ouderenwoning', 'zorgwoning', 'appartement', 'nieuwbouwwoning',
  'slaapkamer', 'kookeiland', 'badkamer', 'tuin', 'balkon',
  'vacature', 'topvacature', 'register-taxateur', 'in dienst getreden',
  'benoemd tot', 'carrière', 'overstap naar',
  'klimaatadaptatie', 'biodiversiteit', 'groene daken', 'groendak',
  'zonnepanelen', 'energielabel', 'warmtepomp', 'verduurzaming',
  'leefbaarheid', 'openbare ruimte', 'stadspark', 'wateroverlast',
]

export const DEFAULT_QUERIES: Record<string, string> = {
  ...Object.fromEntries(
    STEDEN.map(s => [s.id, s.googleNewsQuery])
  ),
  db: 'kantoorinrichting+OR+design+build+OR+kantoorverbouwing+Rotterdam+OR+Eindhoven',
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

const BRONNEN_KEY = 'nieuws_bronnen'
const FILTERS_KEY = 'nieuws_filters'
const QUERIES_KEY = 'nieuws_queries'

async function fetchKey<T>(key: string): Promise<T | null> {
  try {
    const { data } = await supabase.from('edits').select('value').eq('key', key).maybeSingle()
    if (data?.value) return JSON.parse(data.value) as T
  } catch { /* ignore */ }
  return null
}

async function saveKey(key: string, value: unknown) {
  try {
    await supabase.from('edits').upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
  } catch { /* ignore */ }
}

// ── Kleine sub-componenten ───────────────────────────────────────────────────

function Tag({
  label,
  onRemove,
  color = '#f1f5f9',
  textColor = '#475569',
}: {
  label: string
  onRemove: () => void
  color?: string
  textColor?: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600,
        padding: '3px 8px', borderRadius: 20,
        background: color, color: textColor,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer',
          fontSize: 9, color: 'inherit', padding: 0, lineHeight: 1,
        }}
        title={`Verwijder "${label}"`}
      >
        ×
      </button>
    </span>
  )
}

function TagInput({
  placeholder,
  value,
  onChange,
  onAdd,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onAdd: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        placeholder={placeholder}
        style={{
          flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8,
          border: '1px solid #e2e8f0', outline: 'none',
          background: '#fff', color: '#1e293b',
        }}
      />
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: 'none', cursor: value.trim() ? 'pointer' : 'default',
          background: value.trim() ? '#3b82f6' : '#e2e8f0',
          color: value.trim() ? '#fff' : '#94a3b8',
        }}
      >
        + Voeg toe
      </button>
    </div>
  )
}

// ── Hoofd-component ──────────────────────────────────────────────────────────

export default function NieuwsInstellingen() {
  const { isEditMode } = useEditMode()
  const { allSteden: alleSteden } = useAllSteden()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'bronnen' | 'filters' | 'queries'>('bronnen')
  const [loading, setLoading] = useState(false)

  // Data
  const [bronnen, setBronnen]   = useState<Bron[]>(DEFAULT_BRONNEN)
  const [filters, setFilters]   = useState<NieuwsFilters>({ kantoor: DEFAULT_KANTOOR_TERMEN, uitsluit: DEFAULT_UITSLUIT_TERMEN })
  const [queries, setQueries]   = useState<Record<string, string>>(DEFAULT_QUERIES)
  const [savedMsg, setSavedMsg] = useState('')
  const [extraGebiedenPerStad, setExtraGebiedenPerStad] = useState<Record<string, string[]>>({})

  // Bron toevoegen
  const [nieuweBron, setNieuweBron]     = useState({ naam: '', url: '' })
  const [testStatus, setTestStatus]     = useState<'idle' | 'testing' | 'ok' | 'fout'>('idle')
  const [testFout, setTestFout]         = useState('')
  const [testAantal, setTestAantal]     = useState<number | null>(null)

  // Tags toevoegen
  const [nieuwKantoor, setNieuwKantoor] = useState('')
  const [nieuwUitsluit, setNieuwUitsluit] = useState('')

  // Laad instellingen bij openen
  useEffect(() => {
    if (!open) return
    setLoading(true)
    type StadGebied = { id: string; naam: string }
    type CustomStad = { id: string; naam: string; gebieden: StadGebied[] }
    Promise.all([
      fetchKey<Bron[]>(BRONNEN_KEY),
      fetchKey<NieuwsFilters>(FILTERS_KEY),
      fetchKey<Record<string, string>>(QUERIES_KEY),
      fetchKey<Record<string, StadGebied[]>>('extra_gebieden'),
      fetchKey<CustomStad[]>('custom_steden'),
    ]).then(([b, f, q, extra, custom]) => {
      if (b && b.length > 0) setBronnen(b)
      if (f) setFilters(f)
      if (q && Object.keys(q).length > 0) setQueries(q)
      // Bouw extra gebieden map
      const gebMap: Record<string, string[]> = {}
      for (const [stadId, gebieden] of Object.entries(extra ?? {})) {
        gebMap[stadId] = gebieden.map(g => g.naam).filter(n => n.trim())
      }
      for (const cs of custom ?? []) {
        gebMap[cs.id] = cs.gebieden.map(g => g.naam).filter(n => n.trim())
      }
      setExtraGebiedenPerStad(gebMap)
      setLoading(false)
    })
  }, [open])

  function toonOpgeslagen() {
    setSavedMsg('Opgeslagen')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  // ── Bronnen acties ──

  async function toggleBron(id: string) {
    const next = bronnen.map(b => b.id === id ? { ...b, actief: !b.actief } : b)
    setBronnen(next)
    await saveKey(BRONNEN_KEY, next)
    toonOpgeslagen()
  }

  async function verwijderBron(id: string) {
    const next = bronnen.filter(b => b.id !== id)
    setBronnen(next)
    await saveKey(BRONNEN_KEY, next)
    toonOpgeslagen()
  }

  async function testEnVoegToe() {
    const url = nieuweBron.url.trim()
    const naam = nieuweBron.naam.trim()
    if (!url || !naam) return
    setTestStatus('testing')
    setTestFout('')
    setTestAantal(null)
    try {
      const r = await fetch(`/api/test-rss?url=${encodeURIComponent(url)}`)
      const data: { ok: boolean; fout?: string; aantalItems?: number } = await r.json()
      if (data.ok) {
        setTestStatus('ok')
        setTestAantal(data.aantalItems ?? null)
        // Automatisch toevoegen na succesvolle test
        const newBron: Bron = {
          id: `custom_${Date.now()}`,
          naam,
          url,
          actief: true,
        }
        const next = [...bronnen, newBron]
        setBronnen(next)
        await saveKey(BRONNEN_KEY, next)
        toonOpgeslagen()
        setNieuweBron({ naam: '', url: '' })
        setTestStatus('idle')
      } else {
        setTestStatus('fout')
        setTestFout(data.fout ?? 'Onbekende fout')
      }
    } catch (err) {
      setTestStatus('fout')
      setTestFout(err instanceof Error ? err.message : 'Verbindingsfout')
    }
  }

  // ── Filter acties ──

  async function verwijderKantoorTerm(term: string) {
    const next = { ...filters, kantoor: filters.kantoor.filter(t => t !== term) }
    setFilters(next)
    await saveKey(FILTERS_KEY, next)
    toonOpgeslagen()
  }

  async function voegKantoorTermToe() {
    const term = nieuwKantoor.trim().toLowerCase()
    if (!term || filters.kantoor.includes(term)) return
    const next = { ...filters, kantoor: [...filters.kantoor, term] }
    setFilters(next)
    await saveKey(FILTERS_KEY, next)
    toonOpgeslagen()
    setNieuwKantoor('')
  }

  async function verwijderUitsluitTerm(term: string) {
    const next = { ...filters, uitsluit: filters.uitsluit.filter(t => t !== term) }
    setFilters(next)
    await saveKey(FILTERS_KEY, next)
    toonOpgeslagen()
  }

  async function voegUitsluitTermToe() {
    const term = nieuwUitsluit.trim().toLowerCase()
    if (!term || filters.uitsluit.includes(term)) return
    const next = { ...filters, uitsluit: [...filters.uitsluit, term] }
    setFilters(next)
    await saveKey(FILTERS_KEY, next)
    toonOpgeslagen()
    setNieuwUitsluit('')
  }

  // ── Query acties ──

  async function updateQuery(key: string, value: string) {
    const next = { ...queries, [key]: value }
    setQueries(next)
    await saveKey(QUERIES_KEY, next)
    toonOpgeslagen()
  }

  if (!isEditMode) return null

  return (
    <>
      {/* Tandwiel knop */}
      <button
        onClick={() => setOpen(true)}
        title="Nieuwsfeed instellingen"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
      >
        <span style={{ fontSize: 14 }}>⚙</span>
        Instellingen
      </button>

      {/* Overlay + Panel */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
          />

          {/* Panel */}
          <div
            style={{
              position: 'relative', zIndex: 1,
              width: 480, maxWidth: '95vw',
              background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 20px 14px',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Nieuwsfeed instellingen</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Wijzigingen worden direct opgeslagen in Supabase</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {savedMsg && (
                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ {savedMsg}</span>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, fontSize: 16,
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex', borderBottom: '1px solid #e2e8f0',
                padding: '0 20px', flexShrink: 0,
              }}
            >
              {([
                { id: 'bronnen',  label: 'RSS Bronnen' },
                { id: 'filters',  label: 'Filterwoorden' },
                { id: 'queries',  label: 'Zoekopdrachten' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    padding: '10px 14px', fontSize: 12, fontWeight: 600,
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: tab === id ? '#3b82f6' : '#94a3b8',
                    borderBottom: `2px solid ${tab === id ? '#3b82f6' : 'transparent'}`,
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingTop: 40 }}>
                  Laden…
                </div>
              ) : (
                <>
                  {/* ── TAB: BRONNEN ── */}
                  {tab === 'bronnen' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                        Actieve RSS-bronnen worden meegenomen bij elke nieuwsrun. Google News feeds staan apart onder "Zoekopdrachten".
                      </div>

                      {/* Bronnenlijst */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {bronnen.map(bron => (
                          <div
                            key={bron.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 10,
                              border: `1px solid ${bron.actief ? '#dbeafe' : '#e2e8f0'}`,
                              background: bron.actief ? '#f0f7ff' : '#fafafa',
                            }}
                          >
                            {/* Toggle */}
                            <button
                              onClick={() => toggleBron(bron.id)}
                              title={bron.actief ? 'Uitzetten' : 'Aanzetten'}
                              style={{
                                width: 32, height: 18, borderRadius: 20,
                                border: 'none', cursor: 'pointer',
                                background: bron.actief ? '#3b82f6' : '#cbd5e1',
                                position: 'relative', flexShrink: 0,
                                transition: 'background 0.15s',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute', top: 2,
                                  left: bron.actief ? 16 : 2,
                                  width: 14, height: 14, borderRadius: '50%',
                                  background: '#fff',
                                  transition: 'left 0.15s',
                                }}
                              />
                            </button>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{bron.naam}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {bron.url}
                              </div>
                            </div>

                            {/* Verwijder */}
                            <button
                              onClick={() => verwijderBron(bron.id)}
                              title="Verwijder bron"
                              style={{
                                width: 26, height: 26, borderRadius: 8,
                                border: '1px solid #fee2e2', background: '#fff5f5',
                                cursor: 'pointer', fontSize: 12, color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {bronnen.length === 0 && (
                          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
                            Geen bronnen. Voeg er hieronder een toe.
                          </div>
                        )}
                      </div>

                      {/* Bron toevoegen */}
                      <div
                        style={{
                          padding: '14px', borderRadius: 10,
                          border: '1px dashed #cbd5e1', background: '#fafafa',
                          display: 'flex', flexDirection: 'column', gap: 8,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Bron toevoegen
                        </div>
                        <input
                          value={nieuweBron.naam}
                          onChange={e => { setNieuweBron(p => ({ ...p, naam: e.target.value })); setTestStatus('idle') }}
                          placeholder="Naam (bijv. Cobouw)"
                          style={{
                            fontSize: 12, padding: '7px 10px', borderRadius: 8,
                            border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#1e293b',
                          }}
                        />
                        <input
                          value={nieuweBron.url}
                          onChange={e => { setNieuweBron(p => ({ ...p, url: e.target.value })); setTestStatus('idle') }}
                          placeholder="RSS URL (bijv. https://cobouw.nl/feed)"
                          style={{
                            fontSize: 12, padding: '7px 10px', borderRadius: 8,
                            border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#1e293b',
                          }}
                        />

                        {testStatus === 'fout' && (
                          <div style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
                            Ongeldige feed: {testFout}
                          </div>
                        )}
                        {testStatus === 'ok' && (
                          <div style={{ fontSize: 11, color: '#22c55e', background: '#f0fdf4', padding: '6px 10px', borderRadius: 6 }}>
                            ✓ Geldige feed{testAantal != null ? ` — ${testAantal} items gevonden` : ''}. Bron toegevoegd.
                          </div>
                        )}

                        <button
                          onClick={testEnVoegToe}
                          disabled={!nieuweBron.naam.trim() || !nieuweBron.url.trim() || testStatus === 'testing'}
                          style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: (!nieuweBron.naam.trim() || !nieuweBron.url.trim()) ? '#e2e8f0' : '#3b82f6',
                            color: (!nieuweBron.naam.trim() || !nieuweBron.url.trim()) ? '#94a3b8' : '#fff',
                          }}
                        >
                          {testStatus === 'testing' ? 'Feed testen…' : 'Test & voeg toe'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB: FILTERWOORDEN ── */}
                  {tab === 'filters' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Kantoor termen */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                          Kantoor-termen
                          <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                            Artikel moet minimaal één van deze woorden bevatten
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {filters.kantoor.map(term => (
                            <Tag
                              key={term}
                              label={term}
                              onRemove={() => verwijderKantoorTerm(term)}
                              color='#dbeafe'
                              textColor='#1e40af'
                            />
                          ))}
                        </div>
                        <TagInput
                          placeholder="Nieuw filterwoord…"
                          value={nieuwKantoor}
                          onChange={setNieuwKantoor}
                          onAdd={voegKantoorTermToe}
                        />
                      </div>

                      <div style={{ height: 1, background: '#e2e8f0' }} />

                      {/* Uitsluit termen */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                          Uitsluitingswoorden
                          <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                            Artikel met één van deze woorden wordt overgeslagen
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {filters.uitsluit.map(term => (
                            <Tag
                              key={term}
                              label={term}
                              onRemove={() => verwijderUitsluitTerm(term)}
                              color='#fee2e2'
                              textColor='#b91c1c'
                            />
                          ))}
                        </div>
                        <TagInput
                          placeholder="Nieuw uitsluitingswoord…"
                          value={nieuwUitsluit}
                          onChange={setNieuwUitsluit}
                          onAdd={voegUitsluitTermToe}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: 11, color: '#94a3b8', background: '#f8fafc',
                          padding: '10px 12px', borderRadius: 8, lineHeight: 1.6,
                        }}
                      >
                        Let op: filterwijzigingen worden pas actief bij de volgende nieuwsrun (max. 15 min vertraging door Vercel cache).
                      </div>
                    </div>
                  )}

                  {/* ── TAB: ZOEKOPDRACHTEN ── */}
                  {tab === 'queries' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                        Google News RSS-feeds worden opgebouwd uit deze zoekopdrachten. Gebruik + als spatie en OR voor alternatieven.
                      </div>

                      {/* Steden queries — alle steden incl. custom */}
                      {alleSteden.map(stad => {
                        const staticStad = STEDEN.find(s => s.id === stad.id)
                        const kleur = staticStad?.kleur ?? '#6366f1'
                        const defaultQuery = DEFAULT_QUERIES[stad.id]
                          ?? `kantoor+${encodeURIComponent(stad.naam)}+verhuur+OR+transactie+OR+huurder+OR+leegstand`
                        const staticTermen = staticStad?.zoektermen ?? [stad.naam.toLowerCase()]
                        const extraTermen  = extraGebiedenPerStad[stad.id] ?? []
                        const alleTermen   = [...new Set([...staticTermen, ...extraTermen])]
                        return (
                          <div key={stad.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: kleur, flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                                Google News {stad.naam}
                              </span>
                              {!staticStad && (
                                <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>nieuwe stad</span>
                              )}
                            </div>
                            <textarea
                              value={queries[stad.id] ?? defaultQuery}
                              onChange={e => updateQuery(stad.id, e.target.value)}
                              rows={2}
                              style={{
                                width: '100%', fontSize: 11, padding: '8px 10px',
                                borderRadius: 8, border: '1px solid #e2e8f0',
                                background: '#fff', color: '#1e293b',
                                resize: 'vertical', fontFamily: 'monospace',
                                boxSizing: 'border-box', outline: 'none',
                              }}
                            />
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                              URL-preview: news.google.com/rss/search?q=<span style={{ color: '#3b82f6' }}>{queries[stad.id] ?? defaultQuery}</span>&hl=nl&gl=NL
                            </div>
                            {/* Actieve zoektermen */}
                            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginRight: 2, flexShrink: 0 }}>
                                Actieve termen:
                              </span>
                              {alleTermen.map(t => (
                                <span
                                  key={t}
                                  style={{
                                    fontSize: 10, fontWeight: 600,
                                    padding: '1px 7px', borderRadius: 20,
                                    background: kleur + '18', color: kleur,
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {/* D&B feed */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                          Google News Design &amp; Build
                        </div>
                        <textarea
                          value={queries['db'] ?? ''}
                          onChange={e => updateQuery('db', e.target.value)}
                          rows={2}
                          style={{
                            width: '100%', fontSize: 11, padding: '8px 10px',
                            borderRadius: 8, border: '1px solid #e2e8f0',
                            background: '#fff', color: '#1e293b',
                            resize: 'vertical', fontFamily: 'monospace',
                            boxSizing: 'border-box', outline: 'none',
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: 11, color: '#94a3b8', background: '#f8fafc',
                          padding: '10px 12px', borderRadius: 8, lineHeight: 1.6,
                        }}
                      >
                        Zoekopdracht-wijzigingen worden pas actief bij de volgende nieuwsrun.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
