// Studio: which version of a post each app gets from the live share link right now.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string; version?: string }>(event)
  requireAdmin(body?.password)
  const snap = await getContent()
  const post = snap.posts.find((p) => p.slug === body?.slug)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const version = String(body?.version || post.version)
  return { version, apps: await liveStatus(publicOrigin(event), post.slug, version) }
})
