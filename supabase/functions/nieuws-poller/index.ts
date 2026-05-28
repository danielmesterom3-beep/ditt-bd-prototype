// Supabase Edge Function: nieuws-poller
// Schedule: elke 30 minuten via Supabase Cron (pg_cron)
// Deploy: Supabase Dashboard → Edge Functions → New Function → naam: nieuws-poller

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BRONNEN: { naam: string; url: string }[] = [
  { naam: 'PropertyNL',       url: 'https://servicemodule.propertynl.com/api/export/GetRSSArticles?newsChannel=NL&ignoreSticky=true' },
  { naam: 'Vastgoedjournaal', url: 'https://vastgoedjournaal.nl/news/rss' },
  { naam: 'Vastgoednieuws',   url: 'https://vastgoednieuws.nl/news/rss' },
  { naam: 'NVM',              url: 'https://www.nvm.nl/rss/' },
]

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Relevantie-filter voor Ditt BD'er ────────────────────────────────────────
// Woorden die direct waardevolle marktinformatie aanduiden

const STAD_KEYWORDS: Record<string, string[]> = {
  rotterdam: [
    'rotterdam', 'kop van zuid', 'brainpark', 'alexanderpolder',
    'weena', 'blaak', 'scheepvaartkwartier', 'wilhelminakade',
    'coolsingel', 'westblaak', 'binnenrotte',
  ],
  eindhoven: [
    'eindhoven', 'high tech campus', 'htc', 'fellenoord', 'strijp',
    'gestel', 'flight forum', 'stationsgebied eindhoven',
    'brainport', 'kennedyplein',
  ],
}

const RELEVANTE_KEYWORDS = [
  // Transacties & contracten
  'huurcontract', 'huurtransactie', 'verhuurt', 'verhuisd naar',
  'huurt', 'gehuurd', 'm² kantoor', 'm2 kantoor', 'kantoorruimte',
  'kantoorverhuur', 'nieuwe huurder', 'lease',
  // Huurprijzen
  'huurprijs', 'huurprijzen', 'prime rent', 'markthuur', '€/m²',
  'leegstand', 'vacancy', 'opname',
  // Ontwikkelingen
  'kantoorontwikkeling', 'nieuwbouw kantoor', 'oplevering',
  'herontwikkeling', 'renovatie', 'kantoorgebouw',
  'bouwvergunning', 'bestemmingsplan kantoor',
  // Bedrijfsverplaatsingen (inrichtingsvraag)
  'verhuist naar', 'nieuwe vestiging', 'hoofdkantoor',
  'uitbreiding kantoor', 'consolideert',
  // Fit-out / inrichting
  'design and build', 'fit-out', 'inrichting kantoor',
  'turnkey', 'kantoorconcept',
]

type Categorie = 'transactie' | 'huurprijs' | 'ontwikkeling' | 'bedrijf' | 'overig'

function detecteerCategorie(tekst: string): Categorie {
  const t = tekst.toLowerCase()
  if (/huurcontract|huurtransactie|verhuurt|huurt|lease/.test(t)) return 'transactie'
  if (/huurprijs|markthuur|€\/m²|leegstand|vacancy|opname/.test(t)) return 'huurprijs'
  if (/ontwikkeling|nieuwbouw|oplevering|herontwikkeling|bouwvergunning/.test(t)) return 'ontwikkeling'
  if (/verhuist|nieuwe vestiging|hoofdkantoor|uitbreiding|consolideert/.test(t)) return 'bedrijf'
  return 'overig'
}

function detecteerSteden(tekst: string): string[] {
  const t = tekst.toLowerCase()
  const steden: string[] = []
  for (const [stad, keywords] of Object.entries(STAD_KEYWORDS)) {
    if (keywords.some((kw) => t.includes(kw))) steden.push(stad)
  }
  return steden
}

function isRelevant(tekst: string): boolean {
  const t = tekst.toLowerCase()
  const heeftSted = Object.values(STAD_KEYWORDS).flat().some((kw) => t.includes(kw))
  const heeftThema = RELEVANTE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()))
  return heeftSted && heeftThema
}

// ── RSS parser (vanilla, geen deps) ─────────────────────────────────────────

interface RssItem {
  guid:        string
  titel:       string
  url:         string
  samenvatting: string
  gepubliceerd: string
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const blok = match[1]
    const get  = (tag: string) =>
      blok.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1]
      ?? blok.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim()
      ?? ''

    const link = blok.match(/<link>\s*(https?:\/\/[^\s<]+)/)?.[1]
              ?? blok.match(/<guid[^>]*>(https?:\/\/[^\s<]+)/)?.[1]
              ?? ''
    const guid = get('guid') || link

    if (!guid || !get('title')) continue

    items.push({
      guid,
      titel:        get('title'),
      url:          link,
      samenvatting: get('description').replace(/<[^>]+>/g, '').trim(),
      gepubliceerd: get('pubDate'),
    })
  }

  return items
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  let totaalVerwerkt = 0
  let totaalNieuw = 0
  let totaalOvergeslagen = 0

  for (const bron of BRONNEN) {
    let res: Response
    try {
      res = await fetch(bron.url)
    } catch (e) {
      console.error(`Fetch mislukt voor ${bron.naam}:`, e)
      continue
    }

    if (!res.ok) {
      console.error(`RSS fetch mislukt voor ${bron.naam}: ${res.status}`)
      continue
    }

    const xml   = await res.text()
    const items = parseRss(xml)
    totaalVerwerkt += items.length

    for (const item of items) {
      const zoektekst = `${item.titel} ${item.samenvatting}`
      const relevant  = isRelevant(zoektekst)
      const steden    = detecteerSteden(zoektekst)
      const categorie = detecteerCategorie(zoektekst)

      const { error } = await supabase.from('nieuws_items').upsert(
        {
          guid:         item.guid,
          titel:        item.titel,
          url:          item.url,
          samenvatting: item.samenvatting,
          gepubliceerd: item.gepubliceerd ? new Date(item.gepubliceerd).toISOString() : new Date().toISOString(),
          bron:         bron.naam,
          categorie,
          stad:         steden,
          relevant,
        },
        { onConflict: 'guid', ignoreDuplicates: true }
      )

      if (error) {
        console.error('upsert fout:', error.message, item.guid)
      } else {
        relevant ? totaalNieuw++ : totaalOvergeslagen++
      }
    }
  }

  return new Response(
    JSON.stringify({ verwerkt: totaalVerwerkt, relevant: totaalNieuw, overgeslagen: totaalOvergeslagen }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
