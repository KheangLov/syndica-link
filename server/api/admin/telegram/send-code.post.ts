// Step 1: ask Telegram to send a login code to the user's Telegram app.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; apiId?: string; apiHash?: string; phone?: string }>(event)
  requireAdmin(body?.password)
  const apiId = Number(body?.apiId)
  const apiHash = String(body?.apiHash || '').trim()
  const phone = String(body?.phone || '').replace(/[\s()-]/g, '')
  if (!apiId || !/^[a-f0-9]{32}$/i.test(apiHash) || !/^\+?\d{7,15}$/.test(phone))
    throw createError({ statusCode: 400, statusMessage: 'Check the API ID, API hash (32 characters) and phone number (+855…)' })

  const client = await tgClient('', apiId, apiHash)
  try {
    const { phoneCodeHash, isCodeViaApp } = await client.sendCode({ apiId, apiHash }, phone)
    const s = await loginSession(event)
    await s.update({ session: client.session.save() as unknown as string, phone, hash: phoneCodeHash, apiId, apiHash })
    return { ok: true, via: isCodeViaApp ? 'app' : 'sms' }
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: tgError(e) })
  } finally {
    await client.disconnect().catch(() => {})
  }
})
