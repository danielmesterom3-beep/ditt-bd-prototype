import type { IncomingMessage, ServerResponse } from 'node:http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const rawUrl = (req.url ?? '')
  const qIdx = rawUrl.indexOf('?')
  const qs = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : ''
  const params = new URLSearchParams(qs)
  const rssUrl = params.get('url')

  if (!rssUrl) {
    res.statusCode = 400
    res.end(JSON.stringify({ ok: false, fout: 'URL ontbreekt' }))
    return
  }

  try {
    const r = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DittDashboard/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    if (!r.ok) {
      res.end(JSON.stringify({ ok: false, fout: `HTTP ${r.status}` }))
      return
    }
    const text = await r.text()
    const isRss = /<rss|<feed|<channel/i.test(text)
    if (!isRss) {
      res.end(JSON.stringify({ ok: false, fout: 'Geen geldige RSS/Atom feed' }))
      return
    }
    const aantalItems = (text.match(/<item[^>]*>/gi) ?? []).length
    res.end(JSON.stringify({ ok: true, aantalItems }))
  } catch (err) {
    const fout = err instanceof Error ? err.message : String(err)
    res.end(JSON.stringify({ ok: false, fout }))
  }
}
