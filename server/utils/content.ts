// Content layer: reads syndica-web's JSON on the server and keeps it fresh.
//
// GitHub mode (default) asks GitHub for the newest commit at most every
// `contentRefreshSeconds`, then reads files pinned to that commit SHA from
// raw.githubusercontent.com. Pinned URLs are never stale, so a push to
// syndica-web shows up here within seconds — no Pages build to wait for.
// POST /api/revalidate (GitHub push webhook) skips the wait entirely.

import { createHash } from 'node:crypto'
import { readingTime } from '../../app/utils/inline.js'

export interface Block { type: string; text?: string; items?: string[]; [k: string]: unknown }
export interface Post {
  slug: string; title: string; description: string; date: string; updated?: string
  tags: string[]; cover?: string; coverAlt?: string; accent: string; lang?: string
  featured?: boolean; author?: string; blocks: Block[]
  readingTime: number; version: string; image: string | null; imageAlt: string
}
export interface Site {
  name: string; tagline: string; description: string; locale: string; accent: string
  author?: { name?: string; avatar?: string; telegram?: string }
  telegramChannel?: string; twitter?: string
}
interface Snapshot { ref: string; site: Site; posts: Post[]; assetBase: string; loadedAt: number }

const state: { snap?: Snapshot; checkedAt: number; inflight?: Promise<Snapshot> } = { checkedAt: 0 }

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 10)

function cfg() {
  const c = useRuntimeConfig()
  return {
    mode: String(c.contentMode || 'github'),
    repo: String(c.contentRepo),
    branch: String(c.contentBranch || 'main'),
    pagesUrl: String(c.contentPagesUrl).replace(/\/?$/, '/'),
    refreshMs: Number(c.contentRefreshSeconds || 60) * 1000,
    token: String(c.githubToken || ''),
  }
}

async function gh<T>(path: string, accept = 'application/vnd.github+json'): Promise<T> {
  const { token } = cfg()
  return $fetch<T>(`https://api.github.com${path}`, {
    responseType: accept.endsWith('.sha') ? 'text' : 'json',
    headers: { Accept: accept, 'User-Agent': 'syndica-link', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 8000,
  })
}

const text = (url: string) => $fetch<string>(url, { responseType: 'text', timeout: 8000, headers: { 'User-Agent': 'syndica-link' } })

function normalize(slug: string, raw: string, site: Site): Post | null {
  let p: any
  try { p = JSON.parse(raw) } catch { console.warn(`[syndica-link] invalid JSON in ${slug}.json`); return null }
  if (!p.title || !p.description || !p.date || p.draft) return null
  return {
    ...p,
    slug,
    tags: p.tags || [],
    blocks: p.blocks || [],
    accent: p.accent || site.accent,
    readingTime: readingTime(p.blocks),
    version: hash(raw + JSON.stringify(site)), // changes whenever the post (or site name/branding) changes
    image: p.cover || null, // null → generated /og/<slug>.png
    imageAlt: p.cover ? p.coverAlt || p.title : `${p.title} — ${site.name}`,
  }
}

async function loadGithub(): Promise<Snapshot> {
  const { repo, branch } = cfg()
  const sha = (await gh<string>(`/repos/${repo}/commits/${branch}`, 'application/vnd.github.sha')).trim()
  if (state.snap?.ref === sha) return { ...state.snap, loadedAt: Date.now() }

  const raw = (p: string) => `https://raw.githubusercontent.com/${repo}/${sha}/${p}`
  const tree = await gh<{ tree: { path: string; type: string }[] }>(`/repos/${repo}/git/trees/${sha}?recursive=1`)
  const files = tree.tree.filter((f) => f.type === 'blob' && /^public\/content\/posts\/[^/_][^/]*\.json$/.test(f.path))
  const site = JSON.parse(await text(raw('public/content/site.json'))) as Site
  const posts = await Promise.all(
    files.map(async (f) => normalize(f.path.split('/').pop()!.replace(/\.json$/, ''), await text(raw(f.path)), site)),
  )
  return finish(sha, site, posts, raw('public/'))
}

// No-API path (used when the GitHub API is rate-limited): list files via jsDelivr,
// read them from raw.githubusercontent.com at the branch head (cached ≤5 min by GitHub).
async function loadGithubNoApi(): Promise<Snapshot> {
  const { repo, branch } = cfg()
  const listing = await $fetch<{ files: { name: string }[] }>(`https://data.jsdelivr.com/v1/packages/gh/${repo}@${branch}`, {
    query: { structure: 'flat' }, timeout: 8000,
  })
  const files = listing.files.map((f) => f.name.replace(/^\//, '')).filter((f) => /^public\/content\/posts\/[^/_][^/]*\.json$/.test(f))
  if (!files.length) throw new Error('jsDelivr listing returned no posts')
  const raw = (p: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${p}`
  const site = JSON.parse(await text(raw('public/content/site.json'))) as Site
  const posts = await Promise.all(files.map(async (f) => normalize(f.split('/').pop()!.replace(/\.json$/, ''), await text(raw(f)), site)))
  return finish(`${branch}-${hash(JSON.stringify(posts))}`, site, posts, raw('public/'))
}

async function loadPages(): Promise<Snapshot> {
  const { pagesUrl } = cfg()
  const site = JSON.parse(await text(`${pagesUrl}content/site.json?t=${Date.now()}`)) as Site
  const index = JSON.parse(await text(`${pagesUrl}content/posts.json?t=${Date.now()}`)) as { posts: { slug: string }[] }
  const posts = await Promise.all(
    index.posts.map(async (p) => normalize(p.slug, await text(`${pagesUrl}content/posts/${p.slug}.json?t=${Date.now()}`), site)),
  )
  return finish(hash(JSON.stringify(posts)), site, posts, pagesUrl)
}

function finish(ref: string, site: Site, posts: (Post | null)[], assetBase: string): Snapshot {
  const list = posts.filter((p): p is Post => !!p).sort((a, b) => b.date.localeCompare(a.date))
  console.info(`[syndica-link] content @ ${ref.slice(0, 7)} — ${list.length} posts`)
  return { ref, site, posts: list, assetBase, loadedAt: Date.now() }
}

// Try each source in order until one works.
async function loadAny(): Promise<Snapshot> {
  const { mode } = cfg()
  const sources = mode === 'pages' ? [loadPages, loadGithub, loadGithubNoApi] : [loadGithub, loadGithubNoApi, loadPages]
  let last: unknown
  for (const load of sources) {
    try { return await load() } catch (e: any) {
      last = e
      console.warn(`[syndica-link] ${load.name} failed: ${e?.message || e}`)
    }
  }
  throw last
}

// The last good snapshot is also kept on disk, so a restart during a GitHub outage still serves content.
const disk = () => useStorage('data')
async function saveSnapshot(snap: Snapshot) { try { await disk().setItem('content:snapshot', snap) } catch {} }
async function readSnapshot() { try { return (await disk().getItem<Snapshot>('content:snapshot')) || undefined } catch { return undefined } }

/** Current content. Refreshes in the background-safe way: one request at a time, stale data on errors. */
export async function getContent(force = false): Promise<Snapshot> {
  const { refreshMs } = cfg()
  const fresh = state.snap && !force && Date.now() - state.checkedAt < refreshMs
  if (fresh) return state.snap!
  if (!state.inflight) {
    state.inflight = loadAny()
      .then((snap) => {
        if (snap.ref !== state.snap?.ref) saveSnapshot(snap)
        state.snap = snap
        state.checkedAt = Date.now()
        return snap
      })
      .catch(async (e) => {
        console.error('[syndica-link] content refresh failed:', e?.message || e)
        state.snap ??= await readSnapshot()
        if (!state.snap) throw e
        state.checkedAt = Date.now() - refreshMs / 2 // back off a little, keep serving the last good copy
        return state.snap
      })
      .finally(() => { state.inflight = undefined })
  }
  if (force || !state.snap) return state.inflight
  // Wait briefly for the new commit so the very next request is already fresh,
  // but never let a slow GitHub make a visitor (or Telegram's bot) wait long.
  const stale = state.snap
  return Promise.race([state.inflight, new Promise<Snapshot>((r) => setTimeout(() => r(stale), 2500))])
}

export const summarize = ({ blocks, ...rest }: Post) => rest

/** Turn a site-relative path ("/images/x.png") into an absolute URL on the content source. */
export const resolveAsset = (snap: Snapshot, p?: string | null) =>
  !p ? '' : /^https?:\/\//.test(p) ? p : snap.assetBase + p.replace(/^\//, '')

export function publicOrigin(event: Parameters<typeof getRequestURL>[0]) {
  const configured = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
  return configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
}
