import { appendResponseHeader } from 'h3'

/**
 * Tile size (200) when the requester should get the compact card — everyone except crawlers
 * known to suit a wide banner (see server/utils/bots.ts) — or 0 for the wide 1200×630 card.
 */
export function useCompactPreview() {
  return useState<number>('compact-preview', () => {
    if (import.meta.client) return 0
    const ua = useRequestHeaders(['user-agent'])['user-agent'] || ''
    const r = platformFor(ua)
    const compact = r === 'search' ? 0 : r === 'other' ? TILE : platformInfo(r).defaultLayout === 'compact' ? TILE : 0
    const event = useRequestEvent()
    if (event) appendResponseHeader(event, 'Vary', 'User-Agent') // never serve one bot's tags to another from a cache
    return compact
  })
}
