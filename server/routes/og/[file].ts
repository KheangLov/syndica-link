// /og/<slug>.png?v=<version>  and  /og/default.png
export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'file') || '').replace(/\.png$/, '')
  const png = await getOgPng(name, new URL(publicOrigin(event)).host)
  if (!png) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', 'image/png')
  return png
})
