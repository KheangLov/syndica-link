/** Public origin for absolute URLs (og:url, og:image). Config wins; otherwise the request's own host. */
export function useOrigin() {
  const configured = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
  if (configured) return configured
  return useState('origin', () => useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin).value
}
