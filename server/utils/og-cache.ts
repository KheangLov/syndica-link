// Rendered share images, keyed by post version + settings block + kind + domain.
import { resolveShare, requesterForImageKey, type ShareSettings } from '../../app/utils/share-meta'

const cache = new Map<string, Promise<Buffer>>()
/** `square` value for the re-made cover photo (1200×630). */
export const COVER = -1
const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/**
 * Draw a share image.
 * @param name   post slug, or 'default' for the site card
 * @param square 0 = wide 1200×630 card, COVER = the cover photo re-made at 1200×630, otherwise the tile size in px
 * @param key    settings block the image is drawn for: 'default' or an app key (telegram, facebook, …)
 * @param draft  unsaved studio settings (bypasses the cache)
 */
export async function getOgPng(name: string, domain: string, square = 0, key = 'default', draft?: ShareSettings): Promise<Buffer | null> {
  const snap = await getContent()
  const { site } = snap
  const post = snap.posts.find((p) => p.slug === name)
  if (name !== 'default' && !post) return null
  const render = () => {
    if (!post) {
      return square
        ? renderOgSquare({ site: site.name, accent: site.accent, size: square })
        : renderOgImage({ title: site.tagline, site: site.name, domain, accent: site.accent })
    }
    const r = resolveShare(post as any, site, requesterForImageKey(key), '', { assetBase: snap.assetBase, draft })
    const card = () => renderOgImage({ title: r.title, eyebrow: fmt(post.date), tags: post.tags, accent: r.accent, site: site.name, domain })
    const tile = () => renderOgSquare({ site: site.name, accent: r.accent, label: r.label ?? (post.tags[0] ? `#${post.tags[0]}` : undefined), size: square })
    // Any image that can't be fetched or read falls back to the drawn card: never a blank preview.
    const orCard = (why: string) => (e: any) => { console.error(`[og] ${why} for ${post.slug}:`, e?.message); return square > 0 ? tile() : card() }
    if (square === COVER) {
      const src = r.coverSource || (r.customImage ?? (post.image || undefined))
      return src ? renderPhotoCard(src, 1200, 630, r.accent).catch(orCard('cover unreadable')) : card()
    }
    if (square > 0) return r.customImage ? renderPhotoCard(r.customImage, 400, 400, r.accent, square).catch(orCard('tile image unreadable')) : tile()
    return card()
  }
  if (draft) return render()
  const cacheKey = `${post ? `${post.slug}@${post.version}` : `default@${snap.ref}`}@${key}@${domain}@${square}`
  if (!cache.has(cacheKey)) {
    if (cache.size > 300) cache.clear()
    cache.set(cacheKey, render().catch((e) => { cache.delete(cacheKey); throw e }))
  }
  return cache.get(cacheKey)!
}

/** Start rendering in the background so the image is ready when the bot asks for it. */
export const warmOg = (name: string, domain: string, square = 0, key = 'default') => { getOgPng(name, domain, square, key).catch(() => {}) }
