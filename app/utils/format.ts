export const formatDate = (d: string) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/**
 * Preview image for a post: its cover, or the server-generated card. The version lives in the
 * path (no query string), so an edited post gets a new image URL and caches refresh.
 * Covers from GitHub are already pinned to a commit SHA in their path.
 */
export const postImage = (p: { slug: string; image?: string | null; version: string }, origin = '') =>
  p.image || `${origin}/og/${p.slug}/${p.version}.jpg`

/** Clean, shareable path for a post version: /posts/<slug>/<version>. */
export const versionedPath = (p: { slug: string; version: string }) => `/posts/${p.slug}/${p.version}`
