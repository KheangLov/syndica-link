// Studio "Live check": fetch the post exactly as an app's crawler does, then check what it got
// against that app's rules. Reflects what is LIVE (saved settings), not the unsaved draft.
import { PLATFORMS, type PlatformKey } from '../../../../app/utils/share-meta'

type Check = { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }

function predictLayout(app: PlatformKey, w?: number, h?: number, card?: string): string {
  if (!w || !h) return 'unknown (image size not readable)'
  const r = w / h
  switch (app) {
    case 'facebook': return w < 200 || h < 200 ? 'no image (under 200×200)' : w < 600 || h < 315 ? 'compact card' : 'large card'
    case 'whatsapp': return w < 100 ? 'no image (under 100 px)' : w < 300 ? 'compact card (thumbnail beside text)' : 'large card (full-width image)'
    case 'linkedin': return w < 401 ? 'compact card (thumbnail)' : 'large card'
    case 'x': return card === 'summary' ? 'compact card (small square)' : 'large card'
    default: return w >= 400 && r >= 1.2 ? 'large card' : 'compact card (thumbnail)'
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string; platform?: PlatformKey }>(event)
  requireAdmin(body?.password)
  const app = PLATFORMS.find((p) => p.key === body?.platform)
  if (!app) throw createError({ statusCode: 400, statusMessage: 'Unknown app' })
  const url = `${publicOrigin(event)}/posts/${body?.slug}`
  const t0 = Date.now()
  const res = await fetch(url, { headers: { 'User-Agent': app.ua, 'x-syndica-studio': '1' }, redirect: 'manual' })
  const html = await res.text()
  const pageMs = Date.now() - t0
  const meta = readMeta(html)
  const get = (k: string) => meta.tags.find((t) => t.key === k)?.value || ''
  const checks: Check[] = []
  const add = (label: string, status: Check['status'], detail: string) => checks.push({ label, status, detail })

  add('Page loads', res.status === 200 ? 'pass' : 'fail', `HTTP ${res.status} in ${pageMs} ms`)
  add('Tags near the top', meta.tagsAt < 300_000 ? 'pass' : 'fail', `og:image at byte ${meta.tagsAt.toLocaleString()} (WhatsApp reads ~300 KB)`)
  const title = get('og:title') || meta.title
  const desc = get('og:description') || get('description')
  add('Title', !title ? 'fail' : title.length <= app.titleMax ? 'pass' : 'warn', title ? `${[...title].length} characters${title.length > app.titleMax ? ` — ${app.name} may cut it after ~${app.titleMax}` : ''}` : 'missing')
  add('Description', !desc ? 'warn' : desc.length <= app.descMax ? 'pass' : 'warn', desc ? `${[...desc].length} characters${desc.length > app.descMax ? ` — ${app.name} may cut it after ~${app.descMax}` : ''}` : 'missing')

  const imgUrl = get('og:image')
  const others = [get('og:image:secure_url'), get('twitter:image')].filter(Boolean)
  add('One image on the page', others.every((u) => u === imgUrl) ? 'pass' : 'warn', others.every((u) => u === imgUrl) ? 'og:image, secure_url and twitter:image match' : 'Different images: an app may fall back to the other one')
  let image: any = null
  if (!imgUrl) add('Image', 'fail', 'No og:image')
  else {
    const i0 = Date.now()
    try {
      const r = await fetch(imgUrl, { headers: { 'User-Agent': app.ua, 'x-syndica-studio': '1' } })
      const buf = Buffer.from(await r.arrayBuffer())
      const info = imageInfo(buf)
      image = { url: imgUrl, status: r.status, ms: Date.now() - i0, bytes: buf.length, ...info, cache: r.headers.get('cache-control') || '' }
      add('Image loads', r.ok ? (image.ms < 3000 ? 'pass' : 'warn') : 'fail', `HTTP ${r.status}, ${image.ms} ms, ${(buf.length / 1024).toFixed(0)} KB, ${info.width ?? '?'}×${info.height ?? '?'} ${info.type ?? ''}`)
      if (app.key === 'whatsapp') add('WhatsApp file size', buf.length > 600 * 1024 ? 'fail' : buf.length > 300 * 1024 ? 'warn' : 'pass', `${(buf.length / 1024).toFixed(0)} KB (keep under 300 KB; over 600 KB is dropped)`)
      if (app.key === 'facebook' && info.width && (info.width < 200 || (info.height ?? 0) < 200)) add('Facebook minimum', 'fail', 'Under 200×200: Facebook ignores it')
      if (!/^https:\/\//.test(imgUrl) && !/localhost/.test(imgUrl)) add('HTTPS image URL', 'warn', 'Use an https image URL')
      add(`Will show on ${app.name}`, 'pass', predictLayout(app.key, info.width, info.height, get('twitter:card')))
    } catch (e: any) {
      add('Image loads', 'fail', e?.message || 'fetch failed')
    }
  }
  return {
    url, app: app.key, ua: app.ua, status: res.status, pageMs, bytes: meta.bytes,
    preview: { siteName: get('og:site_name'), title, description: desc, image: imgUrl, card: get('twitter:card') },
    image, checks, tags: meta.tags,
  }
})
