import { appendResponseHeader } from 'h3'

/** Which app is fetching this page (telegram, facebook, whatsapp, …, 'search' or 'other'), from its user agent. */
export function useRequester() {
  return useState<Requester>('requester', () => {
    if (import.meta.client) return 'other'
    const ua = useRequestHeaders(['user-agent'])['user-agent'] || ''
    const event = useRequestEvent()
    if (event) appendResponseHeader(event, 'Vary', 'User-Agent') // never serve one app's tags to another from a cache
    return platformFor(ua)
  })
}
