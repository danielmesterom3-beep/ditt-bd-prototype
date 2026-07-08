import type { IncomingMessage, ServerResponse } from 'node:http'

// Alleen feeds die aantoonbaar werken (getest met curl)
const FEEDS = [
  { bron: 'Vastgoedjournaal', url: 'https://vastgoedjournaal.nl/news/rss' },
  { bron: 'Vastgoed Actueel', url: 'https://vastgoedactueel.nl/feed/'    },
]

const STAD_TERMEN = [
  'rotterdam', 'eindhoven', 'kop van zuid', 'wilhelminapier', 'knoop xl',
  'fellenoord', 'strijp-s', 'strijp s', 'flight forum', 'brainport',
  'high tech campus', 'park forum', 'kennedyplein', 'alexandrium',
  'coolsingel', 'schiekade', 'weena', 'hofplein', 'blaak',
]

const KANTOOR_TERMEN = [
  'kantoor', 'kantoren', 'office', 'werkplek', 'werkplekken', 'werkomgeving',
  'huisvesting', 'gehuisvest', 'vierkante meter', 'm²', 'm2', 'vloeroppervlak',
  'verhuurd', 'verhuurt', 'verhuur', 'gehuurd', 'huurt', 'huurder', 'huurovereenkomst',
  'eigenaar', 'eigendom', 'belegger', 'belegging', 'investeerder', 'asset manager',
  'makelaar', 'transactie', 'opname', 'leegstand', 'bezettingsgraad',
  'herontwikkeling', 'renovatie', 'transformatie', 'nieuwbouw', 'oplevering',
  'inrichting', 'design build', 'interieur', 'fit-out', 'fit out',
  'gebiedsontwikkeling', 'masterplan', 'bestemmingsplan',
]

const WONING_TERMEN = [
  'woning', 'woningen', 'woningbouw', 'woningmarkt', 'huurwoning', 'koopwoning',
  'appartement', 'appartementen', 'hypotheek', 'huizenprijs', 'eengezins',
  'sociale huur', 'corporatie', 'woonruimte',
]

const laag = (s: string) => (s ?? '').toLowerCase()
const bevat = (tekst: string, termen: string[]) => termen.some(t => laag(tekst).includes(t))
const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

// Extraheer CDATA of plain tekst uit een XML tag-waarde
function cdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}

// Haal de tekst uit een tag (ook als die CDATA bevat)
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
  relevantieScore: 'hoog' | 'normaal'
}

type FeedStatus = {
  bron: string; actief: boolean; url: string; fout: string | null
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const results: NieuwsApiItem[] = []
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
          feedStatus.push({ bron, actief: false, url, fout: `HTTP ${r.status}` })
          return
        }

        const xml = await r.text()
        const items = parseRss(xml)
        console.log(`[nieuws] ✓ ${bron} — ${items.length} items geparsed`)

        for (const item of items) {
          const titel = stripHtml(item.title)
          const samen = stripHtml(item.description)
          const tekst = titel + ' ' + samen

          if (!bevat(tekst, STAD_TERMEN)) continue
          if (!bevat(tekst, KANTOOR_TERMEN)) continue
          if (bevat(titel, WONING_TERMEN) && !bevat(titel, KANTOOR_TERMEN)) continue

          const steden = detectSteden(tekst)
          const relevantieScore: 'hoog' | 'normaal' =
            bevat(titel, KANTOOR_TERMEN) && bevat(titel, STAD_TERMEN) ? 'hoog' : 'normaal'

          results.push({
            id: item.guid || item.link || `${bron}_${titel}`,
            titel,
            link: item.link,
            datum: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            samenvatting: samen.slice(0, 300),
            bron,
            steden,
            relevantieScore,
          })
        }

        feedStatus.push({ bron, actief: true, url, fout: null })

      } catch (err) {
        const fout = err instanceof Error ? err.message : String(err)
        console.error(`[nieuws] ✗ ${bron}: ${fout}`)
        feedStatus.push({ bron, actief: false, url, fout })
      }
    })
  )

  results.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  console.log(`[nieuws] klaar — ${results.length} relevante items, ${feedStatus.filter(s => s.actief).length}/${feedStatus.length} feeds actief`)

  res.end(JSON.stringify({ items: results.slice(0, 60), feedStatus }))
}
