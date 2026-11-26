// GitHub push webhook (or a manual POST) → reload content immediately.
// Set NUXT_REVALIDATE_SECRET and use the same value as the webhook secret.
import { createHmac, timingSafeEqual } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig().revalidateSecret || '')
  if (!secret) throw createError({ statusCode: 501, statusMessage: 'Set NUXT_REVALIDATE_SECRET to enable revalidation' })

  const body = (await readRawBody(event)) || ''
  const sig = getHeader(event, 'x-hub-signature-256')
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const okSig = !!sig && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  const okToken = getHeader(event, 'authorization') === `Bearer ${secret}`
  if (!okSig && !okToken) throw createError({ statusCode: 401, statusMessage: 'Bad signature' })

  const snap = await getContent(true)
  return { ok: true, ref: snap.ref, posts: snap.posts.length }
})
