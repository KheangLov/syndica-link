/** Crawlers that get the compact card (small square thumbnail + title, like LinkedIn links). Returns the tile size, or 0. */
export const compactTileSize = (ua = '') => (/WhatsApp/i.test(ua) ? 300 : /facebookexternalhit|facebookcatalog|Facebot|meta-externalagent/i.test(ua) ? 200 : 0)
export const isCompactPreviewBot = (ua = '') => compactTileSize(ua) > 0
