// Per-app share settings: which app is asking, and what title / description / image it gets.
// Pure functions (no Nuxt APIs) so the page, the image route and the studio all agree.
//
// A post's JSON (in syndica-web) may carry:
//   "share": {
//     "default":  { "title", "description", "image", "layout", "accent", "label" },   // all apps
//     "telegram": { … }, "facebook": { … }, "whatsapp": { … }, "linkedin": { … },
//     "x": { … }, "discord": { … }, "slack": { … }, "imessage": { … }, "chat": { … }
//   }
// Every field is optional; an app inherits from "default", which inherits from the post.

export type PlatformKey = 'telegram' | 'facebook' | 'whatsapp' | 'linkedin' | 'x' | 'discord' | 'slack' | 'imessage' | 'chat'
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
  { key: 'imessage', name: 'iMessage', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0', defaultLayout: 'large', rule: 'Images about 300 px or wider show as a big card; smaller ones as a small icon beside the title. iMessage shows no description.', titleMax: 80, descMax: 200 },
  { key: 'chat', name: 'Other chat apps', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com', defaultLayout: 'large', rule: 'LINE, Viber, Zalo, KakaoTalk, WeChat, Teams, Skype, Google Chat and Snapchat. Rules differ by app; a 1200×630 image works everywhere.', titleMax: 70, descMax: 120 },
  { key: 'slack', name: 'Slack', ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', defaultLayout: 'large', rule: 'Wide images show under the text; small ones as a thumbnail.', titleMax: 150, descMax: 300 },
]
export const platformInfo = (key: PlatformKey) => PLATFORMS.find((p) => p.key === key)!

/** 'other' = unknown requesters (often WhatsApp or Messenger fetching from the sender's phone). */
export type Requester = PlatformKey | 'search' | 'other'

export function platformFor(ua = ''): Requester {
  if (/TelegramBot/i.test(ua)) return 'telegram'
  // iMessage's preview fetcher claims to be both Facebook and Twitter; Facebook itself never does.
  if (/Facebot Twitterbot/i.test(ua)) return 'imessage'
  // Chat apps that would otherwise be mistaken for Facebook (LINE) or treated as unknown.
  if (/line-poker|\bLine\/|Viber|Zalo|kakaotalk-scrap|SkypeUriPreview|Teams|MicroMessenger|WeChat|Google-PageRenderer|Snapchat|Iframely/i.test(ua)) return 'chat'
  if (/WhatsApp/i.test(ua)) return 'whatsapp'
  if (/facebookexternalhit|facebookcatalog|Facebot|meta-externalagent/i.test(ua)) return 'facebook'
  if (/LinkedInBot/i.test(ua)) return 'linkedin'
  if (/Twitterbot/i.test(ua)) return 'x'
  if (/Discordbot/i.test(ua)) return 'discord'
  if (/Slackbot/i.test(ua)) return 'slack'
  if (/Googlebot|bingbot|Applebot|Pinterest|redditbot|Mastodon|Bluesky|DuckDuckBot|YandexBot/i.test(ua)) return 'search'
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
  /** The original cover / custom image that `-cover.jpg` is made from. */
  coverSource?: string
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
  } else if (custom || post.image) {
    // A cover photo (custom, or the post's own) of any shape, size or format is re-made into a
    // 1200×630 JPEG under 300 KB, so every app accepts it and crops it the same way.
    image = { url: `${base}-cover.jpg`, width: 1200, height: 630, type: 'image/jpeg', alt: custom ? title : post.imageAlt || title, kind: 'cover' }
  } else {
    image = { url: `${base}.jpg`, width: 1200, height: 630, type: 'image/jpeg', alt: title, kind: 'wide' }
  }
  return {
    requester, imageKey, layout, title, description, siteName: site.name, image,
    twitterCard: layout === 'compact' ? 'summary' : 'summary_large_image',
    accent, label, customImage: custom ? abs(custom) : undefined,
    coverSource: layout === 'large' ? (custom ? abs(custom) : post.image ? abs(post.image) : undefined) : undefined,
  }
}

/** Valid image keys in /og/<slug>/<version>/<key>…jpg */
export const IMAGE_KEYS = ['default', ...PLATFORMS.map((p) => p.key)]

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
