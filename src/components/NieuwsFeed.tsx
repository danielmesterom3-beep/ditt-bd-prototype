import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface NieuwsItem {
  id: string
  titel: string
  url: string
  samenvatting: string
  bron: string
  gepubliceerd: string
  categorie: string | null
  stad: string[] | null
}

const CATEGORIE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  transactie:   { label: 'Transactie', bg: '#fef3c7', text: '#92400e' },
  huurprijs:    { label: 'Huurprijs', bg: '#dbeafe', text: '#1e40af' },
  ontwikkeling: { label: 'Ontwikkeling', bg: '#d1fae5', text: '#065f46' },
  bedrijf:      { label: 'Bedrijf', bg: '#ede9fe', text: '#5b21b6' },
  overig:       { label: 'Overig', bg: '#f1f5f9', text: '#475569' },
}

const STAD_KLEUREN: Record<string, { bg: string; text: string }> = {
  rotterdam: { bg: '#fff7ed', text: '#c2410c' },
  eindhoven: { bg: '#eff6ff', text: '#1d4ed8' },
}

function tijdGeleden(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 60)  return `${min}m geleden`
  const uur  = Math.floor(min / 60)
  if (uur < 24)  return `${uur}u geleden`
  return `${Math.floor(uur / 24)}d geleden`
}

export default function NieuwsFeed({ stadFilter }: { stadFilter?: string }) {
  const [items, setItems] = useState<NieuwsItem[]>([])
  const [loading, setLoading] = useState(true)

  async function verwijder(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('nieuws_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  useEffect(() => {
    async function laad() {
      let query = supabase
        .from('nieuws_items')
        .select('id, titel, url, samenvatting, bron, gepubliceerd, categorie, stad')
        .eq('relevant', true)
        .order('gepubliceerd', { ascending: false })
        .limit(30)

      if (stadFilter) {
        query = query.contains('stad', [stadFilter.toLowerCase()])
      }

      const { data } = await query
      setItems(data ?? [])
      setLoading(false)
    }

    laad()
  }, [stadFilter])

  if (loading) {
    return (
      <div style={{ padding: '20px 0', fontSize: 12, color: 'var(--c-subtle)' }}>
        Nieuws laden…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{
        border: '1px dashed var(--c-border)', borderRadius: 10,
        padding: '24px 16px', textAlign: 'center',
        fontSize: 12, color: 'var(--c-muted)', fontStyle: 'italic',
      }}>
        Nog geen relevante berichten, feed wordt elke 30 minuten bijgewerkt.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => {
        const badge = CATEGORIE_BADGE[item.categorie ?? 'overig'] ?? CATEGORIE_BADGE.overig

        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              border: '1px solid var(--c-border)',
              borderRadius: 10,
              padding: '12px 14px',
              background: 'var(--c-surface)',
              textDecoration: 'none',
            }}
          >
            {/* Header rij */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20,
                background: badge.bg, color: badge.text,
              }}>
                {badge.label}
              </span>
              {item.stad?.map((s) => (
                <span key={s} style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                  background: STAD_KLEUREN[s]?.bg ?? '#f1f5f9',
                  color: STAD_KLEUREN[s]?.text ?? '#475569',
                }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--c-subtle)', flexShrink: 0 }}>
                {tijdGeleden(item.gepubliceerd)}
              </span>
              <button
                onClick={(e) => verwijder(item.id, e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--c-subtle)', padding: '0 2px',
                  lineHeight: 1, flexShrink: 0,
                }}
                title="Verwijder"
              >
                ×
              </button>
            </div>

            {/* Titel */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.4, marginBottom: 4 }}>
              {item.titel}
            </div>

            {/* Samenvatting */}
            {item.samenvatting && (
              <div style={{
                fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.6,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {item.samenvatting}
              </div>
            )}

            {/* Bron */}
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--c-subtle)' }}>
              {item.bron}
            </div>
          </a>
        )
      })}
    </div>
  )
}
