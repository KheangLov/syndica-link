// Refresh cached link previews after a post is published or edited:
//  1. warm every share-image variant in Vercel's CDN (Facebook/Messenger, WhatsApp, Telegram),
//  2. ask Facebook to re-scrape the URLs (covers Messenger too),
//  3. send the URLs to @WebpageBot so Telegram re-fetches them.
// Telegram/Facebook steps run only when their credentials are configured.

// One request per image variant: Facebook/Messenger tile (200), WhatsApp/others tile (300), wide card.
const AGENTS = ['facebookexternalhit/1.1', 'WhatsApp/2.24.1.6 A', 'TelegramBot (like TwitterBot)']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function refreshPreviews(origin: string, slugs: string[] | 'all') {
  const c = useRuntimeConfig()
  const snap = await getContent()
  const posts = slugs === 'all' ? snap.posts : snap.posts.filter((p) => slugs.includes(p.slug))
  const urls = posts.flatMap((p) => [`${origin}/posts/${p.slug}`, `${origin}/posts/${p.slug}/`])
  const report: string[] = []
  const log = (m: string) => { report.push(m); console.info('[preview-refresh]', m) }
  if (!urls.length) { log('no matching posts'); return report }

  // 1. Warm images (and the page itself) the way each app requests them.
  await Promise.all(posts.flatMap((p) => AGENTS.map(async (ua) => {
    try {
      const html = await $fetch<string>(`${origin}/posts/${p.slug}`, { headers: { 'User-Agent': ua }, responseType: 'text' })
      const img = html.match(/property="og:image" content="([^"]+)"/)?.[1]
      if (img) await $fetch(img, { headers: { 'User-Agent': ua }, responseType: 'arrayBuffer' })
    } catch (e: any) { log(`warm failed ${p.slug}: ${e?.message}`) }
  })))
  log(`warmed ${posts.length} post(s) × ${AGENTS.length} apps`)

  // 2. Facebook + Messenger re-scrape.
  if (c.fbAppId && c.fbAppSecret) {
    for (const url of urls.filter((u) => !u.endsWith('/'))) {
      try {
        const j: any = await $fetch('https://graph.facebook.com/', {
          method: 'POST',
          body: new URLSearchParams({ id: url, scrape: 'true', access_token: `${c.fbAppId}|${c.fbAppSecret}` }),
        })
        log(`facebook ✓ ${url} — "${j?.title || ''}"`)
      } catch (e: any) { log(`facebook ✗ ${url} — ${e?.data?.error?.message || e?.message}`) }
    }
  } else log('facebook skipped (set NUXT_FB_APP_ID / NUXT_FB_APP_SECRET)')

  // 3. Telegram via @WebpageBot (max 10 links per message).
  if (c.telegramApiId && c.telegramApiHash && c.telegramSession) {
    const client = await tgClient(String(c.telegramSession), Number(c.telegramApiId), String(c.telegramApiHash))
    try {
      for (let i = 0; i < urls.length; i += 10) {
        const batch = urls.slice(i, i + 10)
        const sent = await client.sendMessage('WebpageBot', { message: batch.join('\n'), linkPreview: false })
        let replies: any[] = []
        for (let t = 0; t < 8 && replies.length < batch.length; t++) {
          await sleep(2000)
          replies = (await client.getMessages('WebpageBot', { limit: 20 })).filter((m: any) => m.id > sent.id && !m.out)
        }
        const ok = replies.filter((m: any) => m.media?.webpage?.className === 'WebPage').length
        log(`telegram: @WebpageBot refreshed ${ok}/${batch.length}`)
      }
    } finally { await client.disconnect().catch(() => {}) }
  } else log('telegram skipped (set NUXT_TELEGRAM_API_ID / _API_HASH / _SESSION)')

  return report
}

/** Slugs touched by a GitHub push payload; 'all' when site-wide settings changed. */
export function slugsFromPush(payload: any): string[] | 'all' {
  const files = (payload?.commits || []).flatMap((c: any) => [...(c.added || []), ...(c.modified || [])]) as string[]
  if (files.some((f) => f === 'public/content/site.json')) return 'all'
  return [...new Set(files.map((f) => f.match(/^public\/content\/posts\/([^/_][^/]*)\.json$/)?.[1]).filter(Boolean) as string[])]
}
