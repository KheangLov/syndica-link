// Manual trigger: POST { "slugs": ["khmer"] } or { "slugs": "all" } with "Authorization: Bearer <NUXT_REVALIDATE_SECRET>".
// Waits for the refresh and returns what happened.
export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig().revalidateSecret || '')
  if (!secret || getHeader(event, 'authorization') !== `Bearer ${secret}`) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const body = await readBody<{ slugs?: string[] | 'all' }>(event).catch(() => ({}))
  const report = await refreshPreviews(publicOrigin(event), (body as any)?.slugs ?? 'all')
  return { ok: true, report }
})
