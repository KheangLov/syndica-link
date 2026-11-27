export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const snap = await getContent()
  const post = snap.posts.find((p) => p.slug === slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const domain = new URL(publicOrigin(event)).host
  if (!post.image) warmOg(post.slug, domain)
  const tile = compactTileSize(getHeader(event, 'user-agent'))
  if (tile) warmOg(post.slug, domain, tile)
  return {
    site: snap.site,
    ref: snap.ref,
    assetBase: snap.assetBase,
    post: { ...post, image: resolveAsset(snap, post.image) || null },
  }
})
