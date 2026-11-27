// Studio: draw a share image from UNSAVED settings, returned as a data URL for the live preview.
import type { ShareSettings } from '../../../../app/utils/share-meta'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; slug?: string; key?: string; square?: number; draft?: ShareSettings }>(event)
  requireAdmin(body?.password)
  const key = String(body?.key || 'default')
  if (!/^(default|telegram|facebook|whatsapp|linkedin|x|discord|slack)$/.test(key)) throw createError({ statusCode: 400, statusMessage: 'Unknown app' })
  const square = body?.square ? TILE : 0
  try {
    const img = await getOgPng(String(body?.slug), new URL(publicOrigin(event)).host, square, key, body?.draft || {})
    if (!img) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
    return { dataUrl: `data:image/jpeg;base64,${img.toString('base64')}`, bytes: img.length, width: square || 1200, height: square || 630 }
  } catch (e: any) {
    throw createError({ statusCode: e?.statusCode || 422, statusMessage: e?.statusMessage || `Couldn't draw the image: ${e?.message}` })
  }
})
