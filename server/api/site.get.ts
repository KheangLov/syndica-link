export default defineEventHandler(async (event) => {
  const snap = await getContent()
  warmOg('default', new URL(publicOrigin(event)).host)
  return {
    site: snap.site,
    ref: snap.ref,
    posts: snap.posts.map((p) => ({ ...summarize(p), image: resolveAsset(snap, p.image) || null })),
  }
})
