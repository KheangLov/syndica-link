export const formatDate = (d: string) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** Preview image for a post: its cover, or the server-generated card. Versioned so caches refresh on edits. */
export const postImage = (p: { slug: string; image?: string | null; version: string }, origin = '') =>
  p.image ? `${p.image}${p.image.includes('?') ? '&' : '?'}v=${p.version}` : `${origin}/og/${p.slug}.png?v=${p.version}`
