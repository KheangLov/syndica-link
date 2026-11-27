// Preview images, versioned in the path (no query strings):
//   /og/<slug>/<version>.jpg        wide 1200×630 card (Telegram, LinkedIn, X…)
//   /og/<slug>/<version>-sq200.jpg  200×200 tile → Facebook's compact card (and Messenger)
//   /og/<slug>/<version>-sq300.jpg  300×300 tile → WhatsApp and other apps (WhatsApp's minimum width)
//
// This route must never fail: a missing image makes Messenger/WhatsApp drop the picture.
// If drawing fails or takes too long, a built-in fallback image of the same size is sent instead.
const fallback = async (square: number) =>
  Buffer.from((await useStorage('assets:server').getItemRaw(`fallback/${square ? `sq${square}` : 'wide'}.jpg`)) as ArrayBuffer)

export default defineEventHandler(async (event) => {
  const parts = String(getRouterParam(event, 'path') || '').split('/')
  const name = parts[0].replace(/\.(png|jpe?g)$/, '')
  if (!name || parts.length > 2) throw createError({ statusCode: 404 })
  const m = (parts[parts.length - 1] || '').match(/-sq(200|300)?\.(jpg|png)$/)
  const square = m ? Number(m[1] || 300) : 0

  let img: Buffer | null = null
  let ok = true
  try {
    img = await Promise.race([
      getOgPng(name, new URL(publicOrigin(event)).host, square),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('render timeout')), 8000)),
    ])
    if (!img) throw createError({ statusCode: 404 })
  } catch (e: any) {
    if (e?.statusCode === 404) throw e
    console.error('[og] fallback image for', event.path, e?.message)
    img = await fallback(square)
    ok = false
  }
  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Content-Length', img.length)
  // Versioned URLs never change → cache for a year on Vercel's CDN. Fallbacks are cached only briefly.
  setHeader(event, 'Cache-Control', ok && parts.length === 2 ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60, s-maxage=60')
  return img
})
