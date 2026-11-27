// A small in-memory log of preview fetches (page + image requests): who asked and what they got.
// Also printed to the Vercel runtime log as `[preview-hit] …` lines.
export interface Hit { at: string; kind: 'page' | 'image'; path: string; ua: string; ip?: string; image?: string }
const hits: Hit[] = []
export function recordHit(h: Hit) {
  hits.unshift(h)
  if (hits.length > 300) hits.length = 300
  console.info('[preview-hit]', JSON.stringify(h))
}
export const recentHits = () => hits
