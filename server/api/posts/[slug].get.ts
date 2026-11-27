import { resolveShare, platformFor } from '../../../app/utils/share-meta'
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const snap = await getContent()
  const post = snap.posts.find((p) => p.slug === slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  // Start drawing the image this app will ask for next, so it's ready in time.
  const origin = publicOrigin(event)
  const r = resolveShare({ ...post, image: resolveAsset(snap, post.image) || null } as any, snap.site, platformFor(getHeader(event, 'user-agent')), origin, { assetBase: snap.assetBase })
  if (r.image.kind !== 'cover') warmOg(post.slug, new URL(origin).host, r.layout === 'compact' ? TILE : 0, r.imageKey)
  return {
    site: snap.site,
    ref: snap.ref,
    assetBase: snap.assetBase,
    post: { ...post, image: resolveAsset(snap, post.image) || null },
  }
})
