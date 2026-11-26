// Preview images, versioned in the path (no query strings):
//   /og/<slug>/<version>.png   /og/default/<ref>.png   (legacy: /og/<slug>.png)
export default defineEventHandler(async (event) => {
  const parts = String(getRouterParam(event, 'path') || '').split('/')
  const name = parts[0].replace(/\.png$/, '')
  if (!name || parts.length > 2) throw createError({ statusCode: 404 })
  const png = await getOgPng(name, new URL(publicOrigin(event)).host)
  if (!png) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', parts.length === 2 ? 'public, max-age=31536000, immutable' : 'public, max-age=300')
  return png
})
