// Is the newest version of a post what the apps actually get from the live share link?
// Requests go to the PUBLIC URL, so they land on whichever server copy Vercel picks, just like
// a real crawler's request would.
import { PLATFORMS } from '../../app/utils/share-meta'

export interface LiveState { app: string; version?: string; image?: string; ok: boolean }

export async function liveStatus(origin: string, slug: string, version: string): Promise<LiveState[]> {
  return Promise.all(PLATFORMS.map(async (p) => {
    try {
      const html = await (await fetch(`${origin}/posts/${slug}`, { headers: { 'User-Agent': p.ua, 'x-syndica-studio': '1', 'cache-control': 'no-cache' } })).text()
      const v = html.match(/name="syndica:version" content="([^"]+)"/)?.[1]
      const image = html.match(/property="og:image" content="([^"]+)"/)?.[1]
      return { app: p.key, version: v, image, ok: v === version }
    } catch {
      return { app: p.key, ok: false }
    }
  }))
}

/** Wait until every app gets `version` twice in a row (different server copies), or the time runs out. */
export async function waitForLive(origin: string, slug: string, version: string, timeoutMs = 40_000) {
  const until = Date.now() + timeoutMs
  let streak = 0
  while (Date.now() < until) {
    const states = await liveStatus(origin, slug, version)
    streak = states.every((s) => s.ok) ? streak + 1 : 0
    if (streak >= 2) return true
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}
