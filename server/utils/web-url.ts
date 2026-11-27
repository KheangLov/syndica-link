/** The same page on syndica-web, where posts live and are read. */
export function webUrlFor(path: string) {
  const web = String(useRuntimeConfig().public.webUrl || 'https://syndica-web.vercel.app/').replace(/\/?$/, '/')
  const post = path.match(/^\/posts\/([^/]+)/)
  if (post) return `${web}posts/${post[1]}/`
  const tag = path.match(/^\/tags\/([^/]+)/)
  if (tag) return `${web}tags/${tag[1]}/`
  return web
}
