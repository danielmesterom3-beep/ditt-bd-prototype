import type { IncomingMessage, ServerResponse } from 'node:http'

// ── Supabase config (beschikbaar als process.env in Vercel serverless) ───────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''

interface Bron { id: string; naam: string; url: string; actief: boolean }
interface NieuwsFilters { kantoor: string[]; uitsluit: string[] }

async function fetchSupabaseKey<T>(key: string): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/edits?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!r.ok) return null
    const rows: { value: string }[] = await r.json()
    if (rows[0]?.value) return JSON.parse(rows[0].value) as T
  } catch { /* ignore */ }
  return null
}

// ── STEDEN config inline (Vercel bundelt API routes apart) ───────────────────
// Bron van waarheid voor frontend: /src/config/steden.ts
// Als je een stad toevoegt in steden.ts, voeg die ook hier toe.
const STEDEN = [
  {
    id: 'rotterdam',
    naam: 'Rotterdam',
    zoektermen: [
      'rotterdam', 'kop van zuid', 'wilhelminapier', 'wilhelminakade',
      'coolsingel', 'weena', 'hofplein', 'blaak', 'alexandrium',
      'katendrecht', 'schiekade',
    ],
  },
  {
    id: 'eindhoven',
    naam: 'Eindhoven',
    zoektermen: [
      'eindhoven', 'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'strijp',
      'flight forum', 'brainport', 'high tech campus', 'park forum',
      'kennedyplein', 'meerhoven', 'woensel',
    ],
  },
]

// ── Hardcoded defaults (fallback als Supabase leeg is) ───────────────────────

const DEFAULT_BRONNEN: Bron[] = [
  { id: 'vj', naam: 'Vastgoedjournaal', url: 'https://vastgoedjournaal.nl/news/rss', actief: true },
  { id: 'va', naam: 'Vastgoed Actueel',  url: 'https://vastgoedactueel.nl/feed/',    actief: true },
]

const DEFAULT_QUERIES: Record<string, string> = {
  rotterdam: 'kantoor+Rotterdam+verhuur+OR+transactie+OR+huurder+OR+leegstand',
  eindhoven: 'kantoor+Eindhoven+verhuur+OR+transactie+OR+huurder+OR+leegstand',
  db:        'kantoorinrichting+OR+design+build+OR+kantoorverbouwing+Rotterdam+OR+Eindhoven',
}

const DEFAULT_KANTOOR_TERMEN: string[] = [
  'kantoor', 'kantoren', 'office', 'werkplek', 'werkomgeving',
  'verhuur', 'verhuurd', 'huurder', 'huurovereenkomst',
  'eigenaar', 'belegger', 'vastgoedbelegger', 'asset manager',
  'makelaar', 'transactie', 'aankoop', 'verkoop', 'opname',
  'leegstand', 'bezettingsgraad',
  'm²', 'm2', 'vierkante meter',
  'herontwikkeling', 'renovatie', 'transformatie', 'oplevering',
  'inrichting', 'design build', 'interieur', 'fit-out', 'verbouwing',
  'commercieel vastgoed', 'bedrijfsruimte',
]

const DEFAULT_UITSLUIT_TERMEN: string[] = [
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

// Alle stadszoektermen gecombineerd (statisch — zoektermen worden niet via UI beheerd)
const ALLE_STAD_TERMEN = STEDEN.flatMap(s => s.zoektermen)

// Datum grens: artikelen vóór deze datum worden gefilterd
const DATUM_GRENS = new Date('2026-02-09T00:00:00Z')

// Ranking scoring
const RANK_TITEL_HOOG = ['kantoor', 'kantoren', 'office']
const RANK_TEKST_MID  = ['verhuur', 'verhuurd', 'transactie', 'leegstand', 'makelaar', 'eigenaar', 'belegger']
const RANK_TEKST_LAAG = ['m2', 'm²', 'vierkante meter', 'huurovereenkomst']

const laag = (s: string) => (s ?? '').toLowerCase()
const bevat = (tekst: string, termen: string[]) => termen.some(t => laag(tekst).includes(t))

function stripHtml(s: string): string {
  let t = (s ?? '')
  // Stap 1: echte HTML tags weg
  t = t.replace(/<[^>]*>/g, ' ')
  // Stap 2: HTML entities decoderen
  t = t
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]{2,8};/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
  // Stap 3: nogmaals tags weg (encoded tags zijn nu echte tags geworden)
  t = t.replace(/<[^>]*>/g, ' ')
  // Stap 4: URLs weg
  t = t.replace(/https?:\/\/\S+/g, '')
  // Stap 5: losse HTML-achtige restanten weg (bijv. _blank", href=, font color=)
  t = t.replace(/\b\w[\w-]*=["'][^"']*["']/g, '')
  t = t.replace(/_blank["']?/g, '')
  return t.replace(/\s+/g, ' ').trim()
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
  return STEDEN
    .filter(stad => stad.zoektermen.some(t => laag(tekst).includes(t)))
    .map(s => s.id)
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

  // ── Laad configuratie uit Supabase (met fallback op defaults) ──────────────
  const [sbBronnen, sbFilters, sbQueries] = await Promise.all([
    fetchSupabaseKey<Bron[]>('nieuws_bronnen'),
    fetchSupabaseKey<NieuwsFilters>('nieuws_filters'),
    fetchSupabaseKey<Record<string, string>>('nieuws_queries'),
  ])

  const activeBronnen = (sbBronnen && sbBronnen.length > 0 ? sbBronnen : DEFAULT_BRONNEN)
    .filter(b => b.actief)
  const queries = sbQueries && Object.keys(sbQueries).length > 0 ? sbQueries : DEFAULT_QUERIES
  const KANTOOR_TERMEN = sbFilters?.kantoor?.length ? sbFilters.kantoor : DEFAULT_KANTOOR_TERMEN
  const UITSLUIT_TERMEN = sbFilters?.uitsluit?.length ? sbFilters.uitsluit : DEFAULT_UITSLUIT_TERMEN

  // Bouw FEEDS dynamisch op
  const VASTE_FEEDS = activeBronnen.map(b => ({ bron: b.naam, url: b.url, stripSourceSuffix: false }))
  const GOOGLE_FEEDS = STEDEN.map(stad => ({
    bron: `Google News ${stad.naam}`,
    url: `https://news.google.com/rss/search?q=${queries[stad.id] ?? DEFAULT_QUERIES[stad.id] ?? ''}&hl=nl&gl=NL&ceid=NL:nl`,
    stripSourceSuffix: true,
  }))
  const DB_FEED = {
    bron: 'Google News D&B',
    url: `https://news.google.com/rss/search?q=${queries['db'] ?? DEFAULT_QUERIES['db']}&hl=nl&gl=NL&ceid=NL:nl`,
    stripSourceSuffix: true,
  }
  const FEEDS = [...VASTE_FEEDS, ...GOOGLE_FEEDS, DB_FEED]

  console.log(`[nieuws] config: ${activeBronnen.length} vaste bronnen, ${KANTOOR_TERMEN.length} kantoor-termen, ${UITSLUIT_TERMEN.length} uitsluit-termen (${sbBronnen ? 'Supabase' : 'defaults'})`)

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
        const rawItems = parseRss(xml)
        console.log(`[nieuws] ${bron} stap 0 - raw: ${rawItems.length}`)

        // Debug: eerste 3 items met datum
        rawItems.slice(0, 3).forEach((it, i) => {
          const d = new Date(it.pubDate)
          console.log(`[nieuws]   [${i}] pubDate="${it.pubDate}" parsed=${d.toISOString()} title="${it.title.slice(0, 60)}"`)
        })

        let naDatum = 0, naStad = 0, naKantoor = 0, naUitsluit = 0
        let bronCount = 0

        for (const item of rawItems) {
          // Stap 1: datum filter
          // Robuust: als datum niet te parsen is, artikel behouden
          const artikelDatum = new Date(item.pubDate)
          if (!isNaN(artikelDatum.getTime()) && artikelDatum < DATUM_GRENS) continue
          naDatum++

          const rawTitel = stripHtml(item.title)
          const titel = stripSourceSuffix
            ? rawTitel.replace(/\s+-\s+[^-]+$/, '').trim()
            : rawTitel
          const samen  = stripHtml(item.description)
          const tekst  = titel + ' ' + samen

          // Stap 2: stadsterm verplicht
          if (!bevat(tekst, ALLE_STAD_TERMEN)) continue
          naStad++

          // Stap 3: kantoor-relevantie verplicht
          if (!bevat(tekst, KANTOOR_TERMEN)) continue
          naKantoor++

          // Stap 4: uitsluitingstermen verbieden
          if (bevat(tekst, UITSLUIT_TERMEN)) continue
          naUitsluit++

          const score  = berekenScore(titel, tekst)
          const steden = detectSteden(tekst)
          const datum  = isNaN(artikelDatum.getTime()) ? new Date() : artikelDatum

          results.push({
            id:           item.guid || item.link || `${bron}_${titel}`,
            titel,
            link:         item.link,
            datum:        datum.toISOString(),
            samenvatting: samen.slice(0, 300),
            bron,
            steden,
            score,
            relevantieScore: score >= 10 ? 'hoog' : 'normaal',
          })
          bronCount++
        }

        console.log(`[nieuws] ${bron} — na datum: ${naDatum}, na stad: ${naStad}, na kantoor: ${naKantoor}, na uitsluit/door: ${naUitsluit}`)
        feedStatus.push({ bron, actief: true, url, fout: null, aantalItems: bronCount })

      } catch (err) {
        const fout = err instanceof Error ? err.message : String(err)
        console.error(`[nieuws] ✗ ${bron}: ${fout}`)
        feedStatus.push({ bron, actief: false, url, fout, aantalItems: 0 })
      }
    })
  )

  results.sort((a, b) => b.score - a.score || new Date(b.datum).getTime() - new Date(a.datum).getTime())

  console.log(`[nieuws] klaar — ${results.length} items, ${feedStatus.filter(s => s.actief).length}/${feedStatus.length} feeds actief`)

  res.end(JSON.stringify({ items: results.slice(0, 60), feedStatus }))
}
