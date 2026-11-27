/** The same page on syndica-web, where posts live and are read. Pass `web` (public.webUrl) when calling outside setup. */
export function webUrlFor(path: string, web = (useRuntimeConfig().public as any).webUrl as string) {
  const base = String(web || 'https://syndica-web.vercel.app/').replace(/\/?$/, '/')
  const post = path.match(/^\/posts\/([^/]+)/)
  if (post) return `${base}posts/${post[1]}/`
  const tag = path.match(/^\/tags\/([^/]+)/)
  if (tag) return `${base}tags/${tag[1]}/`
  return base
}
