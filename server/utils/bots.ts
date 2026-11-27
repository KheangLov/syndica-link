// Listing pages (home, tags) and logs: compact tile for apps whose default is the compact card.
import { platformFor, platformInfo, TILE } from '../../app/utils/share-meta'

export { TILE }
/** Tile size for the compact card, or 0 for the wide card (no per-post settings on listing pages). */
export function compactTileSize(ua = '') {
  const r = platformFor(ua)
  if (r === 'search') return 0
  if (r === 'other') return TILE
  return platformInfo(r).defaultLayout === 'compact' ? TILE : 0
}
export const isCompactPreviewBot = (ua = '') => compactTileSize(ua) > 0
