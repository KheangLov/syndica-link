// Load content at boot so the first visitor (or bot) never waits on GitHub.
export default defineNitroPlugin(() => {
  getContent().catch((e) => console.error('[syndica-link] initial content load failed:', e?.message || e))
})
