import { escapeHtml as esc } from '../../app/utils/inline.js'

export default defineEventHandler(async (event) => {
  const snap = await getContent()
  const o = publicOrigin(event)
  const items = snap.posts.map((p) => {
    const url = `${o}/posts/${p.slug}`
    const img = resolveAsset(snap, p.image) || `${o}/og/${p.slug}/${p.version}.png`
    return `<item><title>${esc(p.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description>${p.tags.map((t) => `<category>${esc(t)}</category>`).join('')}<enclosure url="${esc(img)}" type="image/png" length="0"/></item>`
  })
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(snap.site.name)}</title><link>${o}/</link><description>${esc(snap.site.description)}</description>${items.join('')}</channel></rss>`
})
