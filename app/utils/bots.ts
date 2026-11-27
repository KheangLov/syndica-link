// Which share image each requester gets.
//
// Facebook, Messenger and WhatsApp show the compact card (small thumbnail beside the title,
// like LinkedIn company links) when the image is a small square. WhatsApp and Messenger build
// previews on the sender's phone, and those requests don't reliably say who they are, so the
// small square is the DEFAULT. Only crawlers whose apps suit a wide banner get the 1200×630 card.
const WIDE = /TelegramBot|LinkedInBot|Twitterbot|Slackbot|Discordbot|Applebot|Googlebot|bingbot|Pinterest|redditbot|SkypeUriPreview|Mastodon|Bluesky/i

/** Tile size for the compact card (200 px, like LinkedIn's logos), or 0 for the wide card. */
export const compactTileSize = (ua = '') => (WIDE.test(ua) ? 0 : 200)
export const isCompactPreviewBot = (ua = '') => compactTileSize(ua) > 0
