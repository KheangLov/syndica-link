// Studio "Save & publish": write the post's share settings into its JSON file in syndica-web
// (one commit). The push webhook then refreshes Telegram/Facebook; we also start it here.
import { waitUntil } from '@vercel/functions'
import { cleanShare, type ShareSettings } from '../../../../app/utils/share-meta'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string; share?: ShareSettings }>(event)
  requireAdmin(body?.password)
  const slug = String(body?.slug || '')
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) throw createError({ statusCode: 400, statusMessage: 'Bad slug' })
  const c = useRuntimeConfig()
  const repo = String(c.contentRepo), branch = String(c.contentBranch || 'main')
  const path = `public/content/posts/${slug}.json`

  const file = await ghWrite<{ content: string; sha: string }>(`/repos/${repo}/contents/${path}?ref=${branch}`)
  const json = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'))
  const cleaned = cleanShare(body?.share || {})
  if (JSON.stringify(json.share || null) === JSON.stringify(cleaned || null)) return { ok: true, unchanged: true }
  if (cleaned) json.share = cleaned
  else delete json.share
  const text = JSON.stringify(json, null, 2) + '\n'
  const res = await ghWrite<{ commit: { sha: string; html_url: string } }>(`/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    body: { message: `Share settings: ${slug}`, content: Buffer.from(text).toString('base64'), sha: file.sha, branch },
  })

  // The version the share link will serve once every server copy has this commit.
  const snap0 = await getContent()
  const version = postVersion(text, snap0.site)

  // Pick up the new commit here, then (in the background) wait until every app gets the new
  // version from the live link, and refresh Telegram, Facebook/Messenger and the image cache.
  const origin = publicOrigin(event)
  waitUntil((async () => {
    for (let i = 0; i < 8; i++) {
      const snap = await getContent(true)
      if (snap.ref === res.commit.sha) break
      await new Promise((r) => setTimeout(r, 1500))
    }
    await refreshPreviews(origin, [slug])
  })().catch((e) => console.error('[studio] refresh after save failed', e)))

  return { ok: true, commit: res.commit.sha.slice(0, 7), commitUrl: res.commit.html_url, version }
})
