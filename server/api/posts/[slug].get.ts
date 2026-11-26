export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const snap = await getContent()
  const post = snap.posts.find((p) => p.slug === slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  if (!post.image) warmOg(post.slug, new URL(publicOrigin(event)).host)
  return {
    site: snap.site,
    ref: snap.ref,
    assetBase: snap.assetBase,
    post: { ...post, image: resolveAsset(snap, post.image) || null },
  }
})
