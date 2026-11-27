import { appendResponseHeader } from 'h3'

/**
 * True when the request comes from Facebook, Messenger or WhatsApp's link crawler. Those apps
 * show a compact card (square thumbnail + title, like LinkedIn links) when the image is a small
 * square, so we give them a 200 or 300 px tile instead of the wide 1200×630 card.
 */
export function useCompactPreview() {
  return useState<number>('compact-preview', () => {
    if (import.meta.client) return 0
    const ua = useRequestHeaders(['user-agent'])['user-agent'] || ''
    const compact = compactTileSize(ua) // 0, 200 (Facebook/Messenger) or 300 (WhatsApp)
    const event = useRequestEvent()
    if (event) appendResponseHeader(event, 'Vary', 'User-Agent') // never serve one bot's tags to another from a cache
    return compact
  })
}
