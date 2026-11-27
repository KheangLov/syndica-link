import { platformFor } from '../../app/utils/share-meta'
// Log every post page and share-image request with its user agent, so we can see exactly what
// WhatsApp, Messenger, Facebook and Telegram send and which image each one was given.
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  const isPage = /^\/posts\/[^/]+(\/[a-f0-9]{6,40})?\/?$/.test(path) || path === '/'
  const isImage = path.startsWith('/og/')
  if (!isPage && !isImage) return
  const ua = getHeader(event, 'user-agent') || ''
  if (/syndica-link|node|undici/i.test(ua) || getHeader(event, 'x-syndica-studio')) return // our own warm-up / studio checks
  const ip = (getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim() || undefined
  recordHit({
    at: new Date().toISOString(), kind: isImage ? 'image' : 'page', path, ua, ip,
    image: isImage ? undefined : `as ${platformFor(ua)}`,
  })
})
