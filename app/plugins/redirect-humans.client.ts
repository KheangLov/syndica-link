// Fallback for browsers that don't send Sec-Fetch headers: send people to syndica-web.
// Preview crawlers never run JavaScript, so they still read this page's tags.
export default defineNuxtPlugin(() => {
  const web = (useRuntimeConfig().public as any).webUrl as string
  const path = location.pathname
  if (/^\/($|posts\/|tags\/)/.test(path)) location.replace(webUrlFor(path, web))
})
