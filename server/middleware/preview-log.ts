// Log every post page and share-image request with its user agent, so we can see exactly what
// WhatsApp, Messenger, Facebook and Telegram send and which image each one was given.
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  const isPage = /^\/posts\/[^/]+(\/[a-f0-9]{6,40})?\/?$/.test(path) || path === '/'
  const isImage = path.startsWith('/og/')
  if (!isPage && !isImage) return
  const ua = getHeader(event, 'user-agent') || ''
  if (/syndica-link|node|undici/i.test(ua)) return // our own warm-up requests
  const ip = (getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim() || undefined
  const tile = compactTileSize(ua)
  recordHit({
    at: new Date().toISOString(), kind: isImage ? 'image' : 'page', path, ua, ip,
    image: isImage ? undefined : tile ? `square ${tile}×${tile}` : 'wide 1200×630',
  })
})
