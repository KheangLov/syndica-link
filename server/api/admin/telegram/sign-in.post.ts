// Step 2: sign in with the code (and the two-step password if the account has one),
// then return the session string once. Nothing is stored on the server.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string; code?: string; twoFa?: string }>(event)
  requireAdmin(body?.password)
  const s = await loginSession(event)
  const { session, phone, hash, apiId, apiHash } = s.data
  if (!session || !phone || !hash || !apiId || !apiHash) throw createError({ statusCode: 400, statusMessage: 'Start again: the login expired (10 minutes)' })

  const { Api } = await import('telegram')
  const client = await tgClient(session, apiId, apiHash)
  try {
    try {
      await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash: hash, phoneCode: String(body?.code || '').replace(/\D/g, '') }))
    } catch (e: any) {
      if (e?.errorMessage !== 'SESSION_PASSWORD_NEEDED') throw e
      if (!body?.twoFa) {
        await s.update({ session: client.session.save() as unknown as string })
        return { ok: false, needPassword: true }
      }
      await client.signInWithPassword({ apiId, apiHash }, { password: async () => String(body.twoFa), onError: async (err) => { throw err } })
    }
    const me: any = await client.getMe()
    const result = client.session.save() as unknown as string
    await s.clear()
    return { ok: true, session: result, account: [me?.firstName, me?.username && `@${me.username}`].filter(Boolean).join(' ') }
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: tgError(e) })
  } finally {
    await client.disconnect().catch(() => {})
  }
})
