// Admin password kept for this browser tab (sessionStorage), plus a POST helper that sends it.
export function useAdmin() {
  const password = useState<string>('admin-password', () => '')
  if (import.meta.client && !password.value) {
    try { password.value = sessionStorage.getItem('syndica-admin') || '' } catch {}
  }
  const setPassword = (p: string) => {
    password.value = p
    try { p ? sessionStorage.setItem('syndica-admin', p) : sessionStorage.removeItem('syndica-admin') } catch {}
  }
  async function call<T = any>(url: string, body: Record<string, any> = {}): Promise<T> {
    try {
      return await $fetch<T>(url, { method: 'POST', body: { ...body, password: password.value } })
    } catch (e: any) {
      if (e?.statusCode === 401) setPassword('')
      throw new Error(e?.data?.statusMessage || e?.statusMessage || e?.message || 'Request failed')
    }
  }
  return { password, setPassword, call }
}
