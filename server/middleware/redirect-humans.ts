// syndica-link is only the share link: posts live on syndica-web.
// People who open a link in a browser (or an app's in-app browser) are sent to the same page on
// syndica-web. Link-preview crawlers (Telegram, Facebook, WhatsApp, …) get the server-rendered tags.
//
// Browsers mark a page visit with `Sec-Fetch-Dest: document` / `Sec-Fetch-Mode: navigate`;
// preview crawlers don't send these. The page also redirects with JavaScript, which crawlers never run.
export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const path = event.path.split('?')[0]
  if (!/^\/($|posts\/|tags\/)/.test(path)) return // admin pages, APIs, images, feeds stay here
  appendResponseHeader(event, 'Vary', 'Sec-Fetch-Dest, Sec-Fetch-Mode, User-Agent')
  const dest = getHeader(event, 'sec-fetch-dest')
  const mode = getHeader(event, 'sec-fetch-mode')
  if (dest === 'document' || mode === 'navigate') {
    setHeader(event, 'Cache-Control', 'private, no-store')
    return sendRedirect(event, webUrlFor(path), 302)
  }
})
