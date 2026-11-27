// Preview images, versioned in the path (no query strings):
//   /og/<slug>/<version>.jpg      wide 1200×630 card (Telegram, LinkedIn, X…)
//   /og/<slug>/<version>-sq.jpg   square 400×400 tile (Facebook, Messenger, WhatsApp compact layout)
//   /og/default/<ref>.jpg         (legacy .png paths are served too)
export default defineEventHandler(async (event) => {
  const parts = String(getRouterParam(event, 'path') || '').split('/')
  const name = parts[0].replace(/\.(png|jpe?g)$/, '')
  if (!name || parts.length > 2) throw createError({ statusCode: 404 })
  const square = /-sq\.(jpg|png)$/.test(parts[parts.length - 1] || '')
  const png = await getOgPng(name, new URL(publicOrigin(event)).host, square)
  if (!png) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', parts.length === 2 ? 'public, max-age=31536000, immutable' : 'public, max-age=300')
  return png
})
