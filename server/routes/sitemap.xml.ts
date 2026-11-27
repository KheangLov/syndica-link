// Posts are indexed on syndica-web; this sitemap points there.
export default defineEventHandler((event) => sendRedirect(event, webUrlFor('/').replace(/\/$/, '') + '/sitemap.xml', 301))
