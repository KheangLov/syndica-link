export default defineEventHandler(async (event) => {
  const snap = await getContent()
  const o = publicOrigin(event)
  const tags = [...new Set(snap.posts.flatMap((p) => p.tags))]
  const urls = [
    `<url><loc>${o}/</loc></url>`,
    ...snap.posts.map((p) => `<url><loc>${o}/posts/${p.slug}</loc><lastmod>${p.updated || p.date}</lastmod></url>`),
    ...tags.map((t) => `<url><loc>${o}/tags/${encodeURIComponent(t)}</loc></url>`),
  ]
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
})
