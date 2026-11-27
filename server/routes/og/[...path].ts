// Preview images, versioned in the path (no query strings):
//   /og/<slug>/<version>.jpg        wide 1200×630 card (Telegram, LinkedIn, X…)
//   /og/<slug>/<version>-sq256.jpg  256×256 tile → compact card on Facebook, WhatsApp (and Messenger)
//   /og/<slug>/<version>/<app>.jpg / <app>-sq256.jpg  drawn with that app's Share-studio settings
//   /og/<slug>/<version>/<app>-cover.jpg  the post's cover / custom image re-made at 1200×630
//   (-sq200 / -sq300 still served for links shared earlier)
//
// This route must never fail: a missing image makes Messenger/WhatsApp drop the picture.
// If drawing fails or takes too long, a built-in fallback image of the same size is sent instead.
import { IMAGE_KEYS } from '../../../app/utils/share-meta'

const fallback = async (square: number) =>
  Buffer.from((await useStorage('assets:server').getItemRaw(`fallback/${square > 0 ? `sq${square}` : 'wide'}.jpg`)) as ArrayBuffer)

export default defineEventHandler(async (event) => {
  const parts = String(getRouterParam(event, 'path') || '').split('/')
  const name = parts[0].replace(/\.(png|jpe?g)$/, '')
  if (!name || parts.length > 3) throw createError({ statusCode: 404 })
  const file = parts[parts.length - 1] || ''
  const m = file.match(/-sq(200|256|300)?\.(jpg|png)$/)
  const square = m ? Number(m[1] || 256) : /-cover\.jpg$/.test(file) ? COVER : 0
  // /og/<slug>/<version>/<key>[-sq256|-cover].jpg → drawn with that app's share settings
  const key = parts.length === 3 ? file.replace(/(-sq\d+|-cover)?\.(jpg|png)$/, '') : 'default'
  if (!IMAGE_KEYS.includes(key)) throw createError({ statusCode: 404 })

  let img: Buffer | null = null
  let ok = true
  try {
    img = await Promise.race([
      getOgPng(name, new URL(publicOrigin(event)).host, square, key),
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
  setHeader(event, 'Cache-Control', ok && parts.length >= 2 ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60, s-maxage=60')
  return img
})
