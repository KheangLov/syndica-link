// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: true,
  devtools: { enabled: false },
  modules: ['@squirkle-ui/nuxt'],

  squirkle: {
    prefix: 'Sq',
    theme: {
      defaultTheme: 'light',
      themes: { light: { colors: { primary: '#229ED9' } }, dark: { colors: { primary: '#2AABEE' } } },
    },
    appearance: { font: "'Geist Variable', 'Noto Sans Khmer', system-ui, sans-serif", radiusScale: 1.1, smoothing: 0.7 },
    icons: { api: false }, // icons are inline SVG paths
  },

  css: ['@fontsource-variable/geist', '@fontsource/noto-sans-khmer/400.css', '@fontsource/noto-sans-khmer/700.css', '~/assets/css/main.css'],

  runtimeConfig: {
    // Where syndica-web's content lives. "github" reads the repo at its newest commit
    // (fresh seconds after a push); "pages" reads the deployed syndica-web site.
    contentMode: 'github', // NUXT_CONTENT_MODE
    contentRepo: 'KheangLov/syndica-web', // NUXT_CONTENT_REPO
    contentBranch: 'main', // NUXT_CONTENT_BRANCH
    contentPagesUrl: 'https://syndica-web.vercel.app/', // NUXT_CONTENT_PAGES_URL
    contentRefreshSeconds: 0, // NUXT_CONTENT_REFRESH_SECONDS — 0 = auto: every 5 s with a GitHub token, 30 s without
    githubToken: '', // NUXT_GITHUB_TOKEN — optional, raises the GitHub API limit from 60 to 5000/h
    githubWriteToken: '', // NUXT_GITHUB_WRITE_TOKEN — Contents: read & write on syndica-web, for Share studio saves
    revalidateSecret: '', // NUXT_REVALIDATE_SECRET — for POST /api/revalidate (GitHub push webhook)
    adminPassword: '', // NUXT_ADMIN_PASSWORD — unlocks /admin/telegram (falls back to NUXT_REVALIDATE_SECRET)
    // Link-preview refresh after a publish (webhook → /api/revalidate). All optional.
    telegramApiId: '', // NUXT_TELEGRAM_API_ID
    telegramApiHash: '', // NUXT_TELEGRAM_API_HASH
    telegramSession: '', // NUXT_TELEGRAM_SESSION (from /admin/telegram)
    fbAppId: '', // NUXT_FB_APP_ID
    fbAppSecret: '', // NUXT_FB_APP_SECRET
    public: {
      siteUrl: '', // NUXT_PUBLIC_SITE_URL — public origin; falls back to the request's own host
      webUrl: 'https://syndica-web.vercel.app/', // NUXT_PUBLIC_WEB_URL — the syndica-web app
    },
  },

  nitro: {
    // Webhook refreshes (Telegram + Facebook + image warm-up) can take ~30 s.
    vercel: { functions: { maxDuration: 60 } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0B1220', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#F7F8FB', media: '(prefers-color-scheme: light)' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  routeRules: {
    // Always render fresh HTML so bots never get a stale or empty page.
    '/**': { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
    '/admin/**': { ssr: false, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } },
    '/api/admin/**': { headers: { 'cache-control': 'no-store' } },
  },
})
