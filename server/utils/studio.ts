// Helpers for the Share studio (admin only).

/** Width/height/type from the first bytes of a PNG, JPEG, GIF or WebP. */
export function imageInfo(b: Buffer): { width?: number; height?: number; type?: string } {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: 'image/png' }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), type: 'image/jpeg' }
      i += 2 + len
    }
    return { type: 'image/jpeg' }
  }
  if (b.toString('ascii', 0, 3) === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8), type: 'image/gif' }
  if (b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), type: 'image/webp' }
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, type: 'image/webp' }
    if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1, type: 'image/webp' } }
  }
  return {}
}

/** All <meta property|name> tags in an HTML document. */
export function readMeta(html: string) {
  const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : 300_000)
  const tags: { key: string; value: string }[] = []
  for (const m of head.matchAll(/<meta\s+[^>]*>/gi)) {
    const key = m[0].match(/(?:property|name)="([^"]+)"/i)?.[1]
    const value = m[0].match(/content="([^"]*)"/i)?.[1]
    if (key && value !== undefined && /^(og:|twitter:|article:|description$|telegram:|robots$)/.test(key))
      tags.push({ key, value: value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') })
  }
  return { tags, title: head.match(/<title>([^<]*)<\/title>/i)?.[1] || '', bytes: Buffer.byteLength(html), tagsAt: Buffer.byteLength(html.slice(0, html.indexOf('og:image'))) }
}

/** GitHub REST call with the write token. */
export async function ghWrite<T>(path: string, init: { method?: string; body?: any } = {}): Promise<T> {
  const c = useRuntimeConfig()
  const token = String(c.githubWriteToken || c.githubToken || '')
  if (!token) throw createError({ statusCode: 501, statusMessage: 'Set NUXT_GITHUB_WRITE_TOKEN (Contents: read and write on syndica-web) to save from the studio' })
  return $fetch<T>(`https://api.github.com${path}`, {
    method: (init.method || 'GET') as any,
    body: init.body,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'syndica-link-studio', 'X-GitHub-Api-Version': '2022-11-28' },
  })
}
