<script setup lang="ts">
import { useTheme } from '@squirkle-ui/ui'

// Theme lives in a cookie so the server renders the right colours (no flash).
const theme = useCookie<'light' | 'dark' | null>('syndica-theme', { default: () => null, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
const current = computed(() => theme.value || 'light')
const isDark = computed(() => current.value === 'dark')

function syncGlobal() {
  if (import.meta.server) return // squirkle's config is global; never mutate it per request on the server
  const t = useTheme()
  if (t.name !== current.value) t.toggle()
}
onMounted(() => {
  if (!theme.value && matchMedia('(prefers-color-scheme: dark)').matches) theme.value = 'dark'
  syncGlobal()
})
watch(current, syncGlobal)
const toggleTheme = () => { theme.value = isDark.value ? 'light' : 'dark' }

const toast = ref({ show: false, text: '', icon: 'success' })
provide('toast', (text: string, icon = 'success') => { toast.value = { show: true, text, icon } })

const { public: pub } = useRuntimeConfig()
useHead({ htmlAttrs: { class: () => `sq-theme--${current.value}` }, link: [{ rel: 'alternate', type: 'application/rss+xml', title: 'Syndica', href: '/feed.xml' }] })
const year = new Date().getFullYear()
</script>

<template>
  <SqApp :theme="current">
    <SqAppBar floating class="topbar">
      <template #prepend>
        <NuxtLink to="/" class="brand" aria-label="Syndica home">
          <span class="brand__mark"><SqIcon :icon="icons.telegram" size="small" /></span>
          <span class="brand__name">Syndica</span>
        </NuxtLink>
      </template>
      <template #append>
        <nav class="nav">
          <SqBtn variant="text" to="/" size="small" class="nav__btn">Posts</SqBtn>
          <SqBtn variant="tonal" :href="`${pub.webUrl}share`" target="_blank" rel="noopener" size="small" :prepend-icon="icons.flask">Share lab</SqBtn>
          <SqBtn variant="text" size="small" :icon="isDark ? 'sun' : 'moon'" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme" />
        </nav>
      </template>
    </SqAppBar>

    <SqMain>
      <NuxtPage />
    </SqMain>

    <footer class="footer">
      <div class="wrap footer__inner">
        <span>© {{ year }} Syndica · Server-rendered from syndica-web, always fresh on Telegram.</span>
        <span class="footer__links">
          <a href="/feed.xml"><SqIcon :icon="icons.rss" size="x-small" /> RSS</a>
          <a href="/sitemap.xml">Sitemap</a>
          <a href="https://github.com/KheangLov/syndica-link" target="_blank" rel="noopener">Source</a>
        </span>
      </div>
    </footer>

    <ClientOnly><SqSnackbar v-model="toast.show" :text="toast.text" :icon="toast.icon" :timeout="2400" /></ClientOnly>
  </SqApp>
</template>
