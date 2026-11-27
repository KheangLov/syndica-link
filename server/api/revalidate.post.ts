// GitHub push webhook (syndica-web) → reload content now, then refresh the link previews of
// the posts that were added or edited (Telegram, Facebook/Messenger, image CDN) in the background.
// Set NUXT_REVALIDATE_SECRET and use the same value as the webhook secret.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { waitUntil } from '@vercel/functions'

export default defineEventHandler(async (event) => {
  const c = useRuntimeConfig()
  const secret = String(c.revalidateSecret || '')
  if (!secret) throw createError({ statusCode: 501, statusMessage: 'Set NUXT_REVALIDATE_SECRET to enable revalidation' })

  const body = (await readRawBody(event)) || ''
  const sig = getHeader(event, 'x-hub-signature-256')
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const okSig = !!sig && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  const okToken = getHeader(event, 'authorization') === `Bearer ${secret}`
  if (!okSig && !okToken) throw createError({ statusCode: 401, statusMessage: 'Bad signature' })

  const ghEvent = getHeader(event, 'x-github-event')
  if (ghEvent === 'ping') return { ok: true, pong: true }

  let payload: any = {}
  try { payload = body ? JSON.parse(body) : {} } catch {}
  if (payload.ref && payload.ref !== `refs/heads/${c.contentBranch || 'main'}`) return { ok: true, ignored: payload.ref }

  // Reload until we see the pushed commit (GitHub's API can lag the webhook by a moment).
  let snap = await getContent(true)
  for (let i = 0; payload.after && c.contentMode !== 'pages' && snap.ref !== payload.after && i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    snap = await getContent(true)
  }

  const slugs = ghEvent === 'push' ? slugsFromPush(payload) : (payload.slugs ?? 'all')
  const willRefresh = slugs === 'all' || slugs.length > 0
  // Reply to GitHub right away (it waits only 10 s); finish the refresh in the background.
  if (willRefresh) waitUntil(refreshPreviews(publicOrigin(event), slugs).catch((e) => console.error('[preview-refresh]', e)))
  setResponseStatus(event, willRefresh ? 202 : 200)
  return { ok: true, ref: snap.ref.slice(0, 7), posts: snap.posts.length, refreshing: slugs }
})
