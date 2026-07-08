import type { IncomingMessage, ServerResponse } from 'node:http'
import Parser from 'rss-parser'

// Per bron: meerdere paden geprobeerd in volgorde
const FEEDS: { bron: string; urls: string[] }[] = [
  {
    bron: 'Vastgoedjournaal',
    urls: [
      'https://vastgoedjournaal.nl/news/rss',
      'https://vastgoedjournaal.nl/feed',
      'https://vastgoedjournaal.nl/rss',
      'https://vastgoedjournaal.nl/feed.xml',
    ],
  },
  {
    bron: 'Vastgoedmarkt',
    urls: [
      'https://www.vastgoedmarkt.nl/feed',
      'https://www.vastgoedmarkt.nl/rss',
      'https://www.vastgoedmarkt.nl/feed.xml',
      'https://www.vastgoedmarkt.nl/news/rss',
    ],
  },
  {
    bron: 'PropertyNL',
    urls: [
      'https://www.propertynl.com/feed',
      'https://www.propertynl.com/rss',
      'https://www.propertynl.com/feed.xml',
      'https://www.propertynl.com/news/rss',
    ],
  },
  {
    bron: 'Vastgoed Actueel',
    urls: [
      'https://vastgoedactueel.nl/feed',
      'https://vastgoedactueel.nl/rss',
      'https://vastgoedactueel.nl/feed.xml',
      'https://vastgoedactueel.nl/news/rss',
    ],
  },
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
const stripHtml = (html: string) =>
  (html ?? '').replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

function detectSteden(tekst: string): string[] {
  const t = laag(tekst)
  const steden: string[] = []
  if (['rotterdam', 'kop van zuid', 'wilhelminapier', 'coolsingel', 'schiekade', 'weena', 'hofplein', 'blaak', 'alexandrium'].some(w => t.includes(w)))
    steden.push('rotterdam')
  if (['eindhoven', 'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'flight forum', 'brainport', 'high tech campus', 'park forum', 'kennedyplein'].some(w => t.includes(w)))
    steden.push('eindhoven')
  return steden
}

export type FeedStatus = {
  bron: string
  actief: boolean
  url: string | null
  fout: string | null
}

export type NieuwsApiItem = {
  id: string
  titel: string
  link: string
  datum: string
  samenvatting: string
  bron: string
  steden: string[]
  relevantieScore: 'hoog' | 'normaal'
}

export type NieuwsApiResponse = {
  items: NieuwsApiItem[]
  feedStatus: FeedStatus[]
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DittDashboard/1.0)' },
    timeout: 8000,
  })

  const results: NieuwsApiItem[] = []
  const feedStatus: FeedStatus[] = []

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      let werkendUrl: string | null = null
      let fout: string | null = null

      // Probeer urls in volgorde totdat één werkt
      for (const url of feed.urls) {
        try {
          console.log(`[nieuws] probeer ${feed.bron}: ${url}`)
          const parsed = await parser.parseURL(url)

          // Gelukt — verwerk items
          werkendUrl = url
          console.log(`[nieuws] ✓ ${feed.bron} (${url}) — ${parsed.items?.length ?? 0} items`)

          for (const item of parsed.items ?? []) {
            const titel = item.title ?? ''
            const samen = stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? '')
            const tekst = titel + ' ' + samen

            if (!bevat(tekst, STAD_TERMEN)) continue
            if (!bevat(tekst, KANTOOR_TERMEN)) continue
            if (bevat(titel, WONING_TERMEN) && !bevat(titel, KANTOOR_TERMEN)) continue

            const steden = detectSteden(tekst)
            const relevantieScore: 'hoog' | 'normaal' =
              bevat(titel, KANTOOR_TERMEN) && bevat(titel, STAD_TERMEN) ? 'hoog' : 'normaal'

            results.push({
              id: item.guid ?? item.link ?? `${feed.bron}_${titel}`,
              titel,
              link: item.link ?? '',
              datum: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
              samenvatting: samen.slice(0, 300),
              bron: feed.bron,
              steden,
              relevantieScore,
            })
          }
          break // stop zodra één url werkt
        } catch (err) {
          fout = err instanceof Error ? err.message : String(err)
          console.warn(`[nieuws] ✗ ${feed.bron} (${url}): ${fout}`)
        }
      }

      if (!werkendUrl) {
        console.error(`[nieuws] ✗✗ ${feed.bron} — alle urls gefaald`)
      }

      feedStatus.push({
        bron: feed.bron,
        actief: werkendUrl !== null,
        url: werkendUrl,
        fout: werkendUrl ? null : fout,
      })
    })
  )

  results.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  const response: NieuwsApiResponse = {
    items: results.slice(0, 60),
    feedStatus,
  }

  res.end(JSON.stringify(response))
}
