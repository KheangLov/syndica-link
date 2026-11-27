// Studio "Refresh apps": warm images, re-scrape on Facebook, refresh on Telegram — now, for one post.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string }>(event)
  requireAdmin(body?.password)
  await getContent(true)
  const report = await refreshPreviews(publicOrigin(event), [String(body?.slug)], { force: true })
  return { ok: true, report }
})
