import { appendResponseHeader } from 'h3'

/**
 * True when the request comes from Facebook, Messenger or WhatsApp's link crawler. Those apps
 * show a compact card (square thumbnail + title, like LinkedIn links) when the image is a small
 * square, so we give them the 400×400 tile instead of the wide 1200×630 card.
 */
export function useCompactPreview() {
  return useState('compact-preview', () => {
    if (import.meta.client) return false
    const ua = useRequestHeaders(['user-agent'])['user-agent'] || ''
    const compact = isCompactPreviewBot(ua)
    const event = useRequestEvent()
    if (event) appendResponseHeader(event, 'Vary', 'User-Agent') // never serve one bot's tags to another from a cache
    return compact
  })
}
