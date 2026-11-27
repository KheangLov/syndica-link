// Which share image each requester gets.
//
// - Telegram, LinkedIn, X, Slack, Discord, search engines → wide 1200×630 card (their layouts suit a banner).
// - Everyone else (Facebook, Messenger, WhatsApp, phones building previews themselves) → 256×256 tile.
//   WhatsApp picks its layout by image width: 100–299 px → small thumbnail beside the text, 300 px+ → full width.
//   Facebook shows images under 600×315 (and at least 200×200) as the compact card.
//   Messenger always draws images full width; 256 px keeps the tile sharper than 200 px there.
const WIDE = /TelegramBot|LinkedInBot|Twitterbot|Slackbot|Discordbot|Applebot|Googlebot|bingbot|Pinterest|redditbot|SkypeUriPreview|Mastodon|Bluesky/i

export const TILE = 256
/** Tile size in px for the compact card, or 0 for the wide card. */
export const compactTileSize = (ua = '') => (WIDE.test(ua) ? 0 : TILE)
export const isCompactPreviewBot = (ua = '') => compactTileSize(ua) > 0
