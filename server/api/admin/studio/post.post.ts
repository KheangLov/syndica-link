// Studio: one post with its saved share settings, plus what the editor needs.
import { PLATFORMS } from '../../../../app/utils/share-meta'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string }>(event)
  requireAdmin(body?.password)
  const snap = await getContent()
  const post = snap.posts.find((p) => p.slug === body?.slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const { blocks, ...rest } = post
  return {
    site: snap.site,
    ref: snap.ref,
    origin: publicOrigin(event),
    assetBase: snap.assetBase,
    images: snap.images || [],
    platforms: PLATFORMS,
    canSave: !!(useRuntimeConfig().githubWriteToken || useRuntimeConfig().githubToken),
    post: { ...rest, image: resolveAsset(snap, post.image) || null, share: post.share || {} },
  }
})
