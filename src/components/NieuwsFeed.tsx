import { useEffect, useRef, useState } from 'react'
import { STEDEN } from '../config/steden'
import { useAllSteden } from '../context/CustomStedenContext'

interface NieuwsItem {
  id: string
  titel: string
  link: string
  datum: string
  samenvatting: string
  bron: string
  steden: string[]
  relevantieScore: 'hoog' | 'normaal'
  score: number
}

interface FeedStatus {
  bron: string
  actief: boolean
  url: string | null
  fout: string | null
  aantalItems?: number
}

const BRON_BADGE: Record<string, { bg: string; text: string }> = {
  'Vastgoedjournaal': { bg: '#dbeafe', text: '#1e40af' },
  'Vastgoedmarkt':    { bg: '#fed7aa', text: '#c2410c' },
  'PropertyNL':       { bg: '#d1fae5', text: '#065f46' },
  'Vastgoed Actueel': { bg: '#ede9fe', text: '#5b21b6' },
}

// Google News bronnen allemaal rood
function getBronBadge(bron: string): { bg: string; text: string } {
  if (bron.startsWith('Google News')) return { bg: '#fee2e2', text: '#b91c1c' }
  return BRON_BADGE[bron] ?? { bg: '#f1f5f9', text: '#475569' }
}

function tijdGeleden(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 60)  return `${min}m geleden`
  const uur  = Math.floor(min / 60)
  if (uur < 24)  return `${uur}u geleden`
  const dag  = Math.floor(uur / 24)
  if (dag === 1) return 'gisteren'
  return `${dag}d geleden`
}

export default function NieuwsFeed({ stadFilter }: { stadFilter?: string }) {
  const { allSteden: alleSteden } = useAllSteden()
  const [items, setItems]             = useState<NieuwsItem[]>([])
  const [feedStatus, setFeedStatus]   = useState<FeedStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nieuwCount, setNieuwCount]   = useState(0)
  const [stadToggle, setStadToggle]   = useState<string>(stadFilter ?? 'alle')
  const [bronFilter, setBronFilter]   = useState<Set<string>>(new Set())
  const [zoekterm, setZoekterm]       = useState('')
  const [showStatus, setShowStatus]   = useState(false)
  const prevIds = useRef<Set<string>>(new Set())
  const isFirst = useRef(true)

  async function fetchNieuws(bustCache = false) {
    try {
      const url = bustCache ? `/api/nieuws?t=${Date.now()}` : '/api/nieuws'
      const res = await fetch(url)
      if (!res.ok) return
      const data: { items: NieuwsItem[]; feedStatus: FeedStatus[] } = await res.json()
      if (!isFirst.current) {
        const nieuw = data.items.filter(d => !prevIds.current.has(d.id))
        setNieuwCount(nieuw.length)
      }
      prevIds.current = new Set(data.items.map(d => d.id))
      isFirst.current = false
      setItems(data.items)
      setFeedStatus(data.feedStatus ?? [])
      setLastUpdated(new Date())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchNieuws()
    const id = setInterval(fetchNieuws, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { if (stadFilter) setStadToggle(stadFilter) }, [stadFilter])

  const allBronnen = [...new Set(items.map(i => i.bron))]

  const filtered = items.filter(item => {
    if (stadToggle !== 'alle' && !item.steden.includes(stadToggle)) return false
    if (bronFilter.size > 0 && !bronFilter.has(item.bron)) return false
    if (zoekterm) {
      const q = zoekterm.toLowerCase()
      if (!item.titel.toLowerCase().includes(q) && !item.samenvatting.toLowerCase().includes(q)) return false
    }
    return true
  })

  function toggleBron(bron: string) {
    setBronFilter(prev => {
      const next = new Set(prev)
      next.has(bron) ? next.delete(bron) : next.add(bron)
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px', background: 'var(--c-surface)' }}>
            <div style={{ height: 10, width: '40%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }} />
            <div style={{ height: 13, width: '85%', background: '#e2e8f0', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ height: 11, width: '65%', background: '#f1f5f9', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }}>
            {filtered.length} berichten
          </span>
          {nieuwCount > 0 && (
            <span
              style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#ef4444', color: '#fff', cursor: 'pointer' }}
              onClick={() => setNieuwCount(0)}
            >
              +{nieuwCount} nieuw
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>
              bijgewerkt {tijdGeleden(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); setNieuwCount(0); fetchNieuws(true) }}
            style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-muted)', cursor: 'pointer' }}
          >
            ↻ Verversen
          </button>
        </div>
      </div>

      {/* Feed status */}
      {feedStatus.length > 0 && (
        <div>
          <button
            onClick={() => setShowStatus(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {feedStatus.map(s => (
                <div key={s.bron} style={{ width: 7, height: 7, borderRadius: '50%', background: s.actief ? '#22c55e' : '#94a3b8' }} title={s.bron} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>
              {feedStatus.filter(s => s.actief).length}/{feedStatus.length} bronnen actief
            </span>
            <span style={{ fontSize: 10, color: 'var(--c-subtle)' }}>{showStatus ? '▲' : '▼'}</span>
          </button>
          {showStatus && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--c-border)' }}>
              {feedStatus.map(s => (
                <div key={s.bron} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.actief ? '#22c55e' : '#94a3b8', marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>{s.bron}</span>
                    {s.actief
                      ? <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 6 }}>actief{s.aantalItems != null ? ` · ${s.aantalItems} items` : ''}</span>
                      : <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>offline{s.fout ? ` — ${s.fout.slice(0, 60)}` : ''}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stad toggle — alle steden incl. custom */}
      {!stadFilter && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['alle', ...alleSteden.map(s => s.id)].map(id => {
            const staticStad = STEDEN.find(s => s.id === id)
            const alleStad   = alleSteden.find(s => s.id === id)
            const kleur      = staticStad?.kleur ?? '#6366f1'
            const naam       = alleStad?.naam ?? id
            const isActive   = stadToggle === id
            return (
              <button
                key={id}
                onClick={() => setStadToggle(id)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: isActive ? 'transparent' : 'var(--c-border)',
                  background: isActive ? kleur : 'var(--c-surface)',
                  color: isActive ? '#fff' : 'var(--c-muted)',
                }}
              >
                {id === 'alle' ? 'Alle' : naam}
              </button>
            )
          })}
        </div>
      )}

      {/* Bron filters */}
      {allBronnen.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {allBronnen.map(bron => {
            const badge  = getBronBadge(bron)
            const active = bronFilter.has(bron)
            return (
              <button
                key={bron}
                onClick={() => toggleBron(bron)}
                style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  cursor: 'pointer', border: `1px solid ${badge.bg}`,
                  background: active ? badge.text : badge.bg,
                  color: active ? '#fff' : badge.text,
                }}
              >
                {bron}
              </button>
            )
          })}
        </div>
      )}

      {/* Zoekbalk */}
      <input
        placeholder="Zoeken in nieuws..."
        value={zoekterm}
        onChange={e => { setZoekterm(e.target.value); setNieuwCount(0) }}
        style={{
          width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 8,
          border: '1px solid var(--c-border)', background: 'var(--c-surface)',
          color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Berichten */}
      {filtered.length === 0 ? (
        <div style={{ border: '1px dashed var(--c-border)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--c-muted)', fontStyle: 'italic' }}>
          {feedStatus.length > 0 && feedStatus.every(s => !s.actief)
            ? 'Alle nieuwsbronnen zijn momenteel niet bereikbaar. Probeer het later opnieuw.'
            : items.length === 0
            ? 'Geen relevant kantoornieuws voor Rotterdam of Eindhoven gevonden.'
            : 'Geen berichten gevonden voor deze filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const badge  = getBronBadge(item.bron)
            const isHoog = item.relevantieScore === 'hoog'
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--c-border)',
                  borderLeft: isHoog ? '3px solid #f59e0b' : '1px solid var(--c-border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: 'var(--c-surface)',
                }}
              >
                {/* Badge rij */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: badge.bg, color: badge.text }}>
                    {item.bron}
                  </span>
                  {item.steden.map(sid => {
                    const stad = STEDEN.find(s => s.id === sid)
                    return stad ? (
                      <span key={sid} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: stad.kleur + '22', color: stad.kleur }}>
                        {stad.naam}
                      </span>
                    ) : null
                  })}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--c-subtle)', flexShrink: 0 }}>
                    {tijdGeleden(item.datum)}
                  </span>
                </div>

                {/* Titel als klikbare link */}
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.4, display: 'block', marginBottom: 4, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {item.titel}
                </a>

                {/* Samenvatting */}
                {item.samenvatting && (
                  <div style={{
                    fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: 8,
                  }}>
                    {item.samenvatting}
                  </div>
                )}

                {/* Lees artikel knop */}
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#3b82f6',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Lees artikel →
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
