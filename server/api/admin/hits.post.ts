// Recent preview fetches, for the /admin/previews page. Admin password required.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event).catch(() => ({}))
  requireAdmin((body as any)?.password)
  return { instanceStarted: started, hits: recentHits() }
})
const started = new Date().toISOString()
