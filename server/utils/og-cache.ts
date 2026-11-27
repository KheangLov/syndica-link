// Rendered preview images, keyed by slug + content version + domain.
const cache = new Map<string, Promise<Buffer>>()
const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** square: 0 = wide 1200×630 card, otherwise the square tile's size in px (200 or 300). */
export async function getOgPng(name: string, domain: string, square = 0): Promise<Buffer | null> {
  const snap = await getContent()
  const { site } = snap
  const post = snap.posts.find((p) => p.slug === name)
  if (name !== 'default' && !post) return null
  const key = (post ? `${post.slug}@${post.version}@${domain}` : `default@${snap.ref}@${domain}`) + (square ? `@sq${square}` : '')
  if (!cache.has(key)) {
    if (cache.size > 200) cache.clear()
    const job = square
      ? renderOgSquare({ site: site.name, accent: post?.accent || site.accent, label: post?.tags[0] ? `#${post.tags[0]}` : undefined, size: square })
      : post
      ? renderOgImage({ title: post.title, eyebrow: fmt(post.date), tags: post.tags, accent: post.accent, site: site.name, domain })
      : renderOgImage({ title: site.tagline, site: site.name, domain, accent: site.accent })
    cache.set(key, job.catch((e) => { cache.delete(key); throw e }))
  }
  return cache.get(key)!
}

/** Start rendering in the background — called when a page is requested, so the image is ready when the bot asks for it. */
export const warmOg = (name: string, domain: string, square = 0) => { getOgPng(name, domain, square).catch(() => {}) }
