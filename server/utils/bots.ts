// Which share image each requester gets.
//
// - Telegram, LinkedIn, X, Slack, Discord, search engines → wide 1200×630 card (their layouts suit a banner).
// - Facebook's crawler → 200×200 tile: Facebook shows small squares as the compact card (like LinkedIn logos).
// - Everyone else, including WhatsApp and phones building previews themselves → 300×300 tile.
//   WhatsApp ignores images under 300 px wide (it then falls back to another image on the page).
const WIDE = /TelegramBot|LinkedInBot|Twitterbot|Slackbot|Discordbot|Applebot|Googlebot|bingbot|Pinterest|redditbot|SkypeUriPreview|Mastodon|Bluesky/i
const FACEBOOK = /facebookexternalhit|facebookcatalog|Facebot|meta-externalagent/i

/** Tile size in px for the compact card, or 0 for the wide card. */
export const compactTileSize = (ua = '') => (WIDE.test(ua) ? 0 : FACEBOOK.test(ua) ? 200 : 300)
export const isCompactPreviewBot = (ua = '') => compactTileSize(ua) > 0
