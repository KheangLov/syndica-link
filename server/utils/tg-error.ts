const messages: Record<string, string> = {
  PHONE_NUMBER_INVALID: 'That phone number isn’t valid. Use the international format, e.g. +85512345678.',
  PHONE_CODE_INVALID: 'Wrong code. Check the latest code in your Telegram app.',
  PHONE_CODE_EXPIRED: 'The code expired. Start again to get a new one.',
  PASSWORD_HASH_INVALID: 'Wrong two-step verification password.',
  API_ID_INVALID: 'The API ID / API hash pair is wrong. Copy them again from my.telegram.org/apps.',
  PHONE_NUMBER_BANNED: 'This phone number is banned by Telegram.',
  PHONE_NUMBER_FLOOD: 'Too many attempts. Wait a while and try again.',
}
export function tgError(e: any) {
  const code = e?.errorMessage || ''
  if (messages[code]) return messages[code]
  if (/^FLOOD_WAIT_(\d+)/.test(code)) return `Telegram asks you to wait ${code.split('_').pop()} seconds before trying again.`
  return code || e?.message || 'Telegram login failed'
}
