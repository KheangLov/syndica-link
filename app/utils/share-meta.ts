// Per-app share settings: which app is asking, and what title / description / image it gets.
// Pure functions (no Nuxt APIs) so the page, the image route and the studio all agree.
//
// A post's JSON (in syndica-web) may carry:
//   "share": {
//     "default":  { "title", "description", "image", "layout", "accent", "label" },   // all apps
//     "telegram": { … }, "facebook": { … }, "whatsapp": { … }, "linkedin": { … },
//     "x": { … }, "discord": { … }, "slack": { … }
//   }
// Every field is optional; an app inherits from "default", which inherits from the post.

export type PlatformKey = 'telegram' | 'facebook' | 'whatsapp' | 'linkedin' | 'x' | 'discord' | 'slack'
export type Layout = 'large' | 'compact'
export interface ShareFields { title?: string; description?: string; image?: string; layout?: Layout | ''; accent?: string; label?: string }
export type ShareSettings = Partial<Record<'default' | PlatformKey, ShareFields>>

export interface PlatformInfo {
  key: PlatformKey
  name: string
  /** Sample crawler user agent, used by the live check and the image warm-up. */
  ua: string
  defaultLayout: Layout
  /** What decides large vs small, in one line. */
  rule: string
  titleMax: number
  descMax: number
}

export const PLATFORMS: PlatformInfo[] = [
  { key: 'telegram', name: 'Telegram', ua: 'TelegramBot (like TwitterBot)', defaultLayout: 'large', rule: 'Wide images show large; small or square ones as a thumbnail on the right.', titleMax: 100, descMax: 300 },
  { key: 'facebook', name: 'Facebook', ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', defaultLayout: 'compact', rule: 'Under 600×315 (and at least 200×200) shows the compact card; larger shows a banner.', titleMax: 88, descMax: 160 },
  { key: 'whatsapp', name: 'WhatsApp', ua: 'WhatsApp/2.24.20.80 A', defaultLayout: 'compact', rule: '100–299 px wide shows a thumbnail beside the text; 300 px or wider shows it full width. Keep it under 300 KB.', titleMax: 80, descMax: 160 },
  { key: 'linkedin', name: 'LinkedIn', ua: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)', defaultLayout: 'large', rule: 'At least 1200×627 shows large; narrower than 401 px shows a thumbnail.', titleMax: 70, descMax: 100 },
  { key: 'x', name: 'X', ua: 'Twitterbot/1.0', defaultLayout: 'large', rule: 'summary_large_image shows a wide image; summary shows a small square.', titleMax: 70, descMax: 200 },
  { key: 'discord', name: 'Discord', ua: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)', defaultLayout: 'large', rule: 'Large images show under the text; small ones as a thumbnail on the right.', titleMax: 256, descMax: 350 },
  { key: 'slack', name: 'Slack', ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', defaultLayout: 'large', rule: 'Wide images show under the text; small ones as a thumbnail.', titleMax: 150, descMax: 300 },
]
export const platformInfo = (key: PlatformKey) => PLATFORMS.find((p) => p.key === key)!

/** 'other' = unknown requesters (often WhatsApp or Messenger fetching from the sender's phone). */
export type Requester = PlatformKey | 'search' | 'other'

export function platformFor(ua = ''): Requester {
  if (/TelegramBot/i.test(ua)) return 'telegram'
  if (/WhatsApp/i.test(ua)) return 'whatsapp'
  if (/facebookexternalhit|facebookcatalog|Facebot|meta-externalagent/i.test(ua)) return 'facebook'
  if (/LinkedInBot/i.test(ua)) return 'linkedin'
  if (/Twitterbot/i.test(ua)) return 'x'
  if (/Discordbot/i.test(ua)) return 'discord'
  if (/Slackbot/i.test(ua)) return 'slack'
  if (/Googlebot|bingbot|Applebot|Pinterest|redditbot|SkypeUriPreview|Mastodon|Bluesky|DuckDuckBot|YandexBot/i.test(ua)) return 'search'
  return 'other'
}

/** Which saved settings apply: unknown phones use WhatsApp's (most likely WhatsApp or Messenger). */
const chain = (r: Requester): (keyof ShareSettings)[] =>
  r === 'search' ? ['default'] : r === 'other' ? ['whatsapp', 'default'] : [r, 'default']

const defaultLayoutFor = (r: Requester): Layout => (r === 'search' ? 'large' : r === 'other' ? 'compact' : platformInfo(r).defaultLayout)

export const TILE = 256

export interface ResolvedShare {
  requester: Requester
  /** Which settings block the image is drawn for (part of the image URL). */
  imageKey: PlatformKey | 'default'
  layout: Layout
  title: string
  description: string
  siteName: string
  image: { url: string; width?: number; height?: number; type?: string; alt: string; kind: 'wide' | 'tile' | 'cover' }
  twitterCard: 'summary' | 'summary_large_image'
  accent: string
  label?: string
  customImage?: string
}

interface PostLike {
  slug: string; version: string; title: string; description: string; tags: string[]; accent: string
  image?: string | null; imageAlt?: string; imageWidth?: number; imageHeight?: number; imageType?: string
  share?: ShareSettings
}

/** Merge settings for a requester: platform block → default block → post. `draft` replaces post.share (studio). */
export function resolveShare(
  post: PostLike,
  site: { name: string; accent?: string },
  requester: Requester,
  origin: string,
  opts: { assetBase?: string; draft?: ShareSettings } = {},
): ResolvedShare {
  const share = opts.draft ?? post.share ?? {}
  const blocks = chain(requester)
  const pick = <K extends keyof ShareFields>(k: K): ShareFields[K] | undefined => {
    for (const b of blocks) {
      const v = share[b]?.[k]
      if (v !== undefined && v !== null && v !== '') return v
    }
    return undefined
  }
  const imageKey: PlatformKey | 'default' = blocks.find((b) => share[b] && Object.values(share[b]!).some((v) => v)) ?? 'default'
  const layout = (pick('layout') as Layout) || defaultLayoutFor(requester)
  const title = pick('title') || post.title
  const description = pick('description') || post.description
  const accent = pick('accent') || post.accent || site.accent || '#2AABEE'
  const label = pick('label')
  const custom = pick('image')
  const abs = (p: string) => (/^https?:\/\//.test(p) ? p : (opts.assetBase || '') + p.replace(/^\//, ''))
  const base = `${origin}/og/${post.slug}/${post.version}/${imageKey}`

  let image: ResolvedShare['image']
  if (layout === 'compact') {
    image = { url: `${base}-sq${TILE}.jpg`, width: TILE, height: TILE, type: 'image/jpeg', alt: title, kind: 'tile' }
  } else if (custom) {
    image = { url: abs(custom), alt: title, kind: 'cover' }
  } else if (post.image) {
    // The post's own cover (it carries no title, so title overrides don't affect it).
    image = { url: post.image, width: post.imageWidth, height: post.imageHeight, type: post.imageType, alt: post.imageAlt || title, kind: 'cover' }
  } else {
    image = { url: `${base}.jpg`, width: 1200, height: 630, type: 'image/jpeg', alt: title, kind: 'wide' }
  }
  return {
    requester, imageKey, layout, title, description, siteName: site.name, image,
    twitterCard: layout === 'compact' ? 'summary' : 'summary_large_image',
    accent, label, customImage: custom ? abs(custom) : undefined,
  }
}

/** The requester whose settings an image key stands for (used when drawing an image). */
export const requesterForImageKey = (k: string): Requester => (k === 'default' ? 'search' : (PLATFORMS.some((p) => p.key === k) ? (k as PlatformKey) : 'search'))

/** Drop empty fields and empty blocks before saving. */
export function cleanShare(share: ShareSettings): ShareSettings | undefined {
  const out: ShareSettings = {}
  for (const [k, block] of Object.entries(share || {})) {
    const kept = Object.fromEntries(Object.entries(block || {}).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '').map(([f, v]) => [f, typeof v === 'string' ? v.trim() : v]))
    if (Object.keys(kept).length) (out as any)[k] = kept
  }
  return Object.keys(out).length ? out : undefined
}
