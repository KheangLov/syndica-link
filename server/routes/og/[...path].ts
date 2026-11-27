// Preview images, versioned in the path (no query strings):
//   /og/<slug>/<version>.jpg      wide 1200×630 card (Telegram, LinkedIn, X…)
//   /og/<slug>/<version>-sq200.jpg  200×200 tile → Facebook/Messenger compact card (like LinkedIn logos)
//   /og/<slug>/<version>-sq300.jpg  300×300 tile → WhatsApp compact card (its minimum width is 300)
//   /og/default/<ref>.jpg         (legacy .png paths are served too)
export default defineEventHandler(async (event) => {
  const parts = String(getRouterParam(event, 'path') || '').split('/')
  const name = parts[0].replace(/\.(png|jpe?g)$/, '')
  if (!name || parts.length > 2) throw createError({ statusCode: 404 })
  const m = (parts[parts.length - 1] || '').match(/-sq(200|300)?\.(jpg|png)$/)
  const square = m ? Number(m[1] || 300) : 0
  const png = await getOgPng(name, new URL(publicOrigin(event)).host, square)
  if (!png) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', 'image/jpeg')
  // Versioned URLs never change, so let Vercel's CDN keep them: apps get the image instantly
  // instead of waiting for a cold serverless render (WhatsApp/Messenger give up quickly).
  setHeader(event, 'Cache-Control', parts.length === 2 ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=300, s-maxage=300')
  return png
})
