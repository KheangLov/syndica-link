// Admin-only helpers for the one-time Telegram login page.
import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const adminSecret = () => {
  const c = useRuntimeConfig()
  return String(c.adminPassword || c.revalidateSecret || '')
}

/** Throws unless the request carries the admin password (NUXT_ADMIN_PASSWORD, or NUXT_REVALIDATE_SECRET). */
export function requireAdmin(password: unknown) {
  const secret = adminSecret()
  if (secret.length < 12) throw createError({ statusCode: 501, statusMessage: 'Set NUXT_ADMIN_PASSWORD (12+ characters) in Vercel to use this page' })
  const a = createHash('sha256').update(String(password ?? '')).digest()
  const b = createHash('sha256').update(secret).digest()
  if (!timingSafeEqual(a, b)) throw createError({ statusCode: 401, statusMessage: 'Wrong admin password' })
}

/** Encrypted, short-lived cookie that carries the half-finished login between the two steps. */
export function loginSession(event: H3Event) {
  return useSession<{ session?: string; phone?: string; hash?: string; apiId?: number; apiHash?: string }>(event, {
    name: 'tg-login',
    password: createHash('sha256').update('tg-login:' + adminSecret()).digest('hex'),
    maxAge: 10 * 60,
    cookie: { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/admin/telegram' },
  })
}

export async function tgClient(session: string, apiId: number, apiHash: string) {
  const { TelegramClient } = await import('telegram')
  const { StringSession } = await import('telegram/sessions/index.js')
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  client.setLogLevel('error' as any)
  await client.connect()
  return client
}
