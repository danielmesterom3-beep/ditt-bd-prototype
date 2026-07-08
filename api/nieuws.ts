import type { IncomingMessage, ServerResponse } from 'node:http'

const FEEDS = [
  { bron: 'Vastgoedjournaal',      url: 'https://vastgoedjournaal.nl/news/rss',        stripSourceSuffix: false },
  { bron: 'Vastgoed Actueel',      url: 'https://vastgoedactueel.nl/feed/',             stripSourceSuffix: false },
  { bron: 'Stadszaken',            url: 'https://stadszaken.nl/rss',                   stripSourceSuffix: false },
  { bron: 'Google News Rotterdam', url: 'https://news.google.com/rss/search?q=kantoor+Rotterdam+verhuur+OR+transactie+OR+huurder+OR+leegstand&hl=nl&gl=NL&ceid=NL:nl', stripSourceSuffix: true },
  { bron: 'Google News Eindhoven', url: 'https://news.google.com/rss/search?q=kantoor+Eindhoven+verhuur+OR+transactie+OR+huurder+OR+leegstand&hl=nl&gl=NL&ceid=NL:nl', stripSourceSuffix: true },
  { bron: 'Google News D&B',       url: 'https://news.google.com/rss/search?q=kantoorinrichting+OR+design+build+OR+kantoorverbouwing+Rotterdam+OR+Eindhoven&hl=nl&gl=NL&ceid=NL:nl', stripSourceSuffix: true },
]

// Stap 1: stadsterm VERPLICHT aanwezig (hard filter)
const STAD_TERMEN = [
  'rotterdam', 'eindhoven',
  'kop van zuid', 'wilhelminapier', 'wilhelminakade', 'katendrecht',
  'coolsingel', 'weena', 'hofplein', 'blaak', 'alexanderplein', 'stadionweg',
  'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'strijp',
  'flight forum', 'brainport', 'high tech campus', 'park forum',
  'kennedyplein', 'meerhoven', 'woensel',
]

// Stap 2: kantoor-relevantie VERPLICHT (hard filter)
const KANTOOR_TERMEN = [
  'kantoor', 'kantoren', 'office', 'werkplek', 'werkomgeving', 'huisvesting',
  'verhuur', 'verhuurd', 'huurder', 'huurovereenkomst', 'gehuurd',
  'eigenaar', 'belegger', 'belegging', 'investeerder', 'asset manager',
  'makelaar', 'transactie', 'aankoop', 'verkoop', 'opname',
  'leegstand', 'bezettingsgraad',
  'm²', 'm2', 'vierkante meter', 'vloeroppervlak',
  'herontwikkeling', 'renovatie', 'transformatie', 'nieuwbouw', 'oplevering',
  'inrichting', 'design build', 'interieur', 'fit-out', 'verbouwing',
  'gebiedsontwikkeling', 'bestemmingsplan', 'masterplan',
  'bedrijfsruimte', 'commercieel vastgoed', 'vastgoedbelegger',
]

// Stap 3: uitsluitingstermen (hard filter — artikel valt af als titel+samen dit bevat)
const UITSLUIT_TERMEN = [
  'woning', 'woningen', 'woningbouw', 'woningmarkt', 'koopwoning', 'huurwoning',
  'sociale huur', 'hypotheek', 'huizenprijs', 'eengezins', 'corporatie',
  'ouderenwoning', 'zorgwoning', 'appartement', 'nieuwbouwwoning',
  'slaapkamer', 'kookeiland', 'badkamer', 'tuin', 'balkon',
  'vacature', 'topvacature', 'register-taxateur', 'in dienst getreden',
  'benoemd tot', 'carrière', 'overstap naar',
]

// Stap 3: scoring voor ranking
const RANK_TITEL_HOOG = ['kantoor', 'kantoren', 'office']
const RANK_TEKST_MID  = ['verhuur', 'verhuurd', 'transactie', 'leegstand', 'makelaar', 'eigenaar', 'belegger']
const RANK_TEKST_LAAG = ['m2', 'm²', 'vierkante meter', 'huurovereenkomst']

const laag = (s: string) => (s ?? '').toLowerCase()
const bevat = (tekst: string, termen: string[]) => termen.some(t => laag(tekst).includes(t))

function stripHtml(s: string): string {
  return (s ?? '')
    .replace(/<[^>]*>/g, '')
    // HTML entities: named + numeric
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&[a-z]{2,8};/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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

function berekenScore(titel: string, tekst: string): number {
  let score = 0
  if (bevat(titel, RANK_TITEL_HOOG)) score += 10
  if (bevat(tekst,  RANK_TEKST_MID))  score += 5
  if (bevat(tekst,  RANK_TEKST_LAAG)) score += 3
  return score
}

function detectSteden(tekst: string): string[] {
  const t = laag(tekst)
  const steden: string[] = []
  if (['rotterdam', 'kop van zuid', 'wilhelminapier', 'wilhelminakade', 'katendrecht',
       'coolsingel', 'weena', 'hofplein', 'blaak', 'alexanderplein', 'stadionweg'].some(w => t.includes(w)))
    steden.push('rotterdam')
  if (['eindhoven', 'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'strijp',
       'flight forum', 'brainport', 'high tech campus', 'park forum',
       'kennedyplein', 'meerhoven', 'woensel'].some(w => t.includes(w)))
    steden.push('eindhoven')
  return steden
}

type NieuwsApiItem = {
  id: string; titel: string; link: string; datum: string
  samenvatting: string; bron: string; steden: string[]
  relevantieScore: 'hoog' | 'normaal'
  score: number
}

type FeedStatus = {
  bron: string; actief: boolean; url: string; fout: string | null; aantalItems: number
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const results: NieuwsApiItem[] = []
  const feedStatus: FeedStatus[] = []

  await Promise.allSettled(
    FEEDS.map(async ({ bron, url, stripSourceSuffix }) => {
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
        console.log(`[nieuws] ${bron} — ${items.length} raw items`)

        // Debug: eerste 5 titels
        items.slice(0, 5).forEach((it, i) =>
          console.log(`[nieuws]   [${i}] ${it.title.slice(0, 80)}`)
        )

        let bronCount = 0
        for (const item of items) {
          // Google News titels eindigen op " - Bronnaam" — strip dat
          const rawTitel = stripHtml(item.title)
          const titel = stripSourceSuffix
            ? rawTitel.replace(/\s+-\s+[^-]+$/, '').trim()
            : rawTitel
          const samen  = stripHtml(item.description)
          const tekst  = titel + ' ' + samen

          // Hard filter 1: stadsterm verplicht
          if (!bevat(tekst, STAD_TERMEN)) continue

          // Hard filter 2: kantoor-relevantie verplicht
          if (!bevat(tekst, KANTOOR_TERMEN)) continue

          // Hard filter 3: uitsluitingstermen verbieden
          if (bevat(tekst, UITSLUIT_TERMEN)) continue

          const score  = berekenScore(titel, tekst)
          const steden = detectSteden(tekst)

          results.push({
            id:           item.guid || item.link || `${bron}_${titel}`,
            titel,
            link:         item.link,
            datum:        item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            samenvatting: samen.slice(0, 300),
            bron,
            steden,
            score,
            relevantieScore: score >= 10 ? 'hoog' : 'normaal',
          })
          bronCount++
        }

        console.log(`[nieuws] ${bron} — ${bronCount} items na filter`)
        feedStatus.push({ bron, actief: true, url, fout: null, aantalItems: bronCount })

      } catch (err) {
        const fout = err instanceof Error ? err.message : String(err)
        console.error(`[nieuws] ✗ ${bron}: ${fout}`)
        feedStatus.push({ bron, actief: false, url, fout, aantalItems: 0 })
      }
    })
  )

  // Sorteer: score desc, dan datum desc
  results.sort((a, b) => b.score - a.score || new Date(b.datum).getTime() - new Date(a.datum).getTime())

  console.log(`[nieuws] klaar — ${results.length} relevante items, ${feedStatus.filter(s => s.actief).length}/${feedStatus.length} feeds actief`)

  res.end(JSON.stringify({ items: results.slice(0, 60), feedStatus }))
}
