#!/usr/bin/env node
// Request every post page the way each app's crawler does, then fetch the og:image it gets.
// That puts every image variant in Vercel's CDN, so Facebook, Messenger, WhatsApp and
// Telegram get images instantly instead of waiting for a cold serverless render.
//
// Usage: node scripts/warm-share-images.mjs [https://syndica-link.vercel.app] [slug…]
const BASE = (process.argv[2] || process.env.LINK_URL || 'https://syndica-link.vercel.app').replace(/\/+$/, '')
const only = process.argv.slice(3)
const AGENTS = {
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  whatsapp: 'WhatsApp/2.24.1.6 A',
  telegram: 'TelegramBot (like TwitterBot)',
}

const { posts } = await (await fetch(`${BASE}/api/site`)).json()
const paths = ['/', ...posts.filter((p) => !only.length || only.includes(p.slug)).map((p) => `/posts/${p.slug}`)]
let ok = 0, fail = 0
for (const path of paths) {
  for (const [app, ua] of Object.entries(AGENTS)) {
    try {
      const html = await (await fetch(BASE + path, { headers: { 'User-Agent': ua } })).text()
      const img = html.match(/property="og:image" content="([^"]+)"/)?.[1]
      if (!img) throw new Error('no og:image')
      const t = Date.now()
      const r = await fetch(img, { headers: { 'User-Agent': ua } })
      await r.arrayBuffer()
      if (!r.ok) throw new Error(`image ${r.status}`)
      console.log(`✓ ${app.padEnd(8)} ${path}  ${img.split('/og/')[1]}  ${Date.now() - t}ms  cache:${r.headers.get('x-vercel-cache') || '-'}`)
      ok++
    } catch (e) {
      console.log(`✗ ${app.padEnd(8)} ${path}  ${e.message}`)
      fail++
    }
  }
}
console.log(`\n${ok} warmed, ${fail} failed`)
