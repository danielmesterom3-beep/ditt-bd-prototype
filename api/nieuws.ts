import type { IncomingMessage, ServerResponse } from 'node:http'

const FEEDS = [
  { bron: 'Vastgoedjournaal', url: 'https://vastgoedjournaal.nl/news/rss' },
  { bron: 'Vastgoed Actueel', url: 'https://vastgoedactueel.nl/feed/' },
  { bron: 'Stadszaken',       url: 'https://stadszaken.nl/rss' },
]

// Scoring: +10 stad hoofdterm
const STAD_HOOFD = ['rotterdam', 'eindhoven']

// +5 specifieke locaties
const STAD_LOCATIES = [
  'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'flight forum', 'brainport',
  'high tech campus', 'park forum', 'kennedyplein',
  'wilhelminapier', 'kop van zuid', 'coolsingel', 'schiekade', 'weena', 'hofplein',
  'blaak', 'alexandrium',
]

// +5 kantoor/commercieel vastgoed termen
const KANTOOR_TERMEN = [
  'kantoor', 'kantoren', 'office', 'werkplek', 'werkplekken', 'werkomgeving',
  'huisvesting', 'gehuisvest', 'vierkante meter', 'm²', 'm2', 'vloeroppervlak',
  'verhuurd', 'verhuurt', 'verhuur', 'gehuurd', 'huurt', 'huurder', 'huurovereenkomst',
  'eigenaar', 'eigendom', 'belegger', 'belegging', 'investeerder', 'asset manager',
  'makelaar', 'transactie', 'opname', 'leegstand', 'bezettingsgraad',
  'herontwikkeling', 'renovatie', 'transformatie', 'nieuwbouw', 'oplevering',
  'inrichting', 'design build', 'interieur', 'fit-out', 'fit out',
  'gebiedsontwikkeling', 'masterplan', 'bedrijfsruimte', 'werklocatie', 'werklocaties',
  'commercieel vastgoed', 'bedrijfspand', 'bedrijventerrein',
]

// -20 woning (alleen als geen kantoor ook aanwezig)
const WONING_TERMEN = [
  'woning', 'woningen', 'woningbouw', 'woningmarkt', 'huurwoning', 'koopwoning',
  'appartement', 'appartementen', 'hypotheek', 'huizenprijs', 'eengezins',
  'sociale huur', 'corporatie', 'woonruimte',
]

const laag = (s: string) => (s ?? '').toLowerCase()
const bevat = (tekst: string, termen: string[]) => termen.some(t => laag(tekst).includes(t))
const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

function cdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return m ? cdata(m[1].trim()) : ''
}

function parseRss(xml: string): { title: string; link: string; pubDate: string; description: string; guid: string }[] {
  const items: { title: string; link: string; pubDate: string; description: string; guid: string }[] = []
  for (const m of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)) {
    const b = m[1]
    items.push({
      title:       tag(b, 'title'),
      link:        tag(b, 'link'),
      pubDate:     tag(b, 'pubDate'),
      description: tag(b, 'description'),
      guid:        tag(b, 'guid'),
    })
  }
  return items
}

function berekenScore(tekst: string, titel: string): number {
  let score = 0
  if (bevat(tekst, STAD_HOOFD))    score += 10
  if (bevat(tekst, STAD_LOCATIES)) score += 5
  if (bevat(tekst, KANTOOR_TERMEN)) score += 5
  // -20 alleen als woning ZONDER kantoor
  if (bevat(tekst, WONING_TERMEN) && !bevat(tekst, KANTOOR_TERMEN)) score -= 20
  // bonus: titel bevat zowel stad als kantoor
  if (bevat(titel, STAD_HOOFD) && bevat(titel, KANTOOR_TERMEN)) score += 5
  return score
}

function detectSteden(tekst: string): string[] {
  const t = laag(tekst)
  const steden: string[] = []
  if (['rotterdam', 'kop van zuid', 'wilhelminapier', 'coolsingel', 'schiekade', 'weena', 'hofplein', 'blaak', 'alexandrium'].some(w => t.includes(w)))
    steden.push('rotterdam')
  if (['eindhoven', 'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'flight forum', 'brainport', 'high tech campus', 'park forum', 'kennedyplein'].some(w => t.includes(w)))
    steden.push('eindhoven')
  return steden
}

type NieuwsApiItem = {
  id: string; titel: string; link: string; datum: string
  samenvatting: string; bron: string; steden: string[]
  relevantieScore: 'hoog' | 'normaal' | 'ongefilterd'
  score: number
}

type FeedStatus = {
  bron: string; actief: boolean; url: string; fout: string | null; aantalItems: number
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const alleItems: NieuwsApiItem[] = []
  const feedStatus: FeedStatus[] = []

  await Promise.allSettled(
    FEEDS.map(async ({ bron, url }) => {
      try {
        console.log(`[nieuws] fetch ${bron}: ${url}`)
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DittDashboard/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          // @ts-expect-error Node 18 fetch supports redirect
          redirect: 'follow',
        })

        console.log(`[nieuws] ${bron} → HTTP ${r.status}`)

        if (!r.ok) {
          feedStatus.push({ bron, actief: false, url, fout: `HTTP ${r.status}`, aantalItems: 0 })
          return
        }

        const xml = await r.text()
        const items = parseRss(xml)
        console.log(`[nieuws] ${bron} — ${items.length} items geparsed`)

        // DEBUG: eerste 5 titels loggen
        items.slice(0, 5).forEach((it, i) =>
          console.log(`[nieuws]   [${i}] ${it.title.slice(0, 80)}`)
        )

        let bronCount = 0
        for (const item of items) {
          const titel   = stripHtml(item.title)
          const samen   = stripHtml(item.description)
          const tekst   = titel + ' ' + samen
          const score   = berekenScore(tekst, titel)
          const steden  = detectSteden(tekst)

          alleItems.push({
            id:              item.guid || item.link || `${bron}_${titel}`,
            titel,
            link:            item.link,
            datum:           item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            samenvatting:    samen.slice(0, 300),
            bron,
            steden,
            score,
            relevantieScore: score >= 15 ? 'hoog' : score > 0 ? 'normaal' : 'ongefilterd',
          })
          bronCount++
        }

        feedStatus.push({ bron, actief: true, url, fout: null, aantalItems: bronCount })

      } catch (err) {
        const fout = err instanceof Error ? err.message : String(err)
        console.error(`[nieuws] ✗ ${bron}: ${fout}`)
        feedStatus.push({ bron, actief: false, url, fout, aantalItems: 0 })
      }
    })
  )

  console.log(`[nieuws] totaal items voor filter: ${alleItems.length}`)

  // Gefilterd: score > 0, gesorteerd score desc dan datum desc
  let results = alleItems
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.datum).getTime() - new Date(a.datum).getTime())

  console.log(`[nieuws] na scoring (>0): ${results.length} items`)

  // Fallback: als 0 resultaten, toon 10 recente ongefilterd
  const fallback = results.length === 0
  if (fallback) {
    console.log('[nieuws] fallback: geen scorende items, toon 10 meest recent ongefilterd')
    results = alleItems
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 10)
      .map(i => ({ ...i, relevantieScore: 'ongefilterd' as const }))
  }

  console.log(`[nieuws] klaar — ${results.length} items, ${feedStatus.filter(s => s.actief).length}/${feedStatus.length} feeds actief`)

  res.end(JSON.stringify({ items: results.slice(0, 60), feedStatus, fallback }))
}
