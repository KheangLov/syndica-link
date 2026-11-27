<script setup lang="ts">
// Admin: see which app fetched which link, with which user agent, and which image it got.
useSeoMeta({ title: 'Preview log · Syndica admin', robots: 'noindex, nofollow' })
const password = ref('')
const hits = ref<any[]>([])
const error = ref('')
const loading = ref(false)
const started = ref('')
let timer: any
async function load() {
  loading.value = true
  try {
    const r = await $fetch<any>('/api/admin/hits', { method: 'POST', body: { password: password.value } })
    hits.value = r.hits; started.value = r.instanceStarted; error.value = ''
  } catch (e: any) { error.value = e?.data?.statusMessage || e?.message } finally { loading.value = false }
}
function start() { load(); clearInterval(timer); timer = setInterval(load, 4000) }
onBeforeUnmount(() => clearInterval(timer))
const who = (ua: string) =>
  /WhatsApp/i.test(ua) ? 'WhatsApp' : /facebookexternalhit|Facebot|meta-external/i.test(ua) ? 'Facebook / Messenger (Meta)' :
  /TelegramBot/i.test(ua) ? 'Telegram' : /LinkedInBot/i.test(ua) ? 'LinkedIn' : /Twitterbot/i.test(ua) ? 'X / iMessage' :
  /okhttp|Dalvik|CFNetwork|Android|iPhone/i.test(ua) ? 'A phone app or browser' : 'Other'
const time = (s: string) => new Date(s).toLocaleTimeString()
</script>

<template>
  <div class="wrap log">
    <nav class="adminnav"><NuxtLink to="/admin/studio">Share studio</NuxtLink> · <NuxtLink to="/admin/previews">Preview log</NuxtLink> · <NuxtLink to="/admin/telegram">Telegram login</NuxtLink></nav>
    <header class="head">
      <span class="eyebrow">Admin</span>
      <h1>Preview log</h1>
      <p class="muted">Paste a test link into WhatsApp or Messenger, then watch who fetched it and which image they got. Updates every 4 seconds.</p>
    </header>
    <form class="bar" @submit.prevent="start">
      <SqTextField v-model="password" type="password" label="Admin password" hide-details autocomplete="current-password" />
      <SqBtn type="submit" :loading="loading">Show log</SqBtn>
    </form>
    <SqAlert v-if="error" type="error" :text="error" />
    <p v-if="started" class="muted small">Server instance started {{ time(started) }} · {{ hits.length }} requests</p>
    <div v-for="(h, i) in hits" :key="i" class="hit">
      <div class="row1">
        <SqChip size="small" :color="h.kind === 'image' ? 'secondary' : 'primary'" variant="tonal">{{ h.kind }}</SqChip>
        <strong>{{ who(h.ua) }}</strong>
        <span class="muted small">{{ time(h.at) }}</span>
      </div>
      <code class="path">{{ h.path }}</code>
      <div v-if="h.image" class="small">Image given: <strong>{{ h.image }}</strong></div>
      <div class="ua small muted">{{ h.ua || '(no user agent)' }}</div>
    </div>
  </div>
</template>

<style scoped>
.log { max-width: 760px; }
.head { padding: 32px 0 16px; }
.head h1 { font-size: 2rem; letter-spacing: -0.03em; margin: 8px 0; }
.head p { margin: 0; }
.bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.bar > :first-child { flex: 1; }
.small { font-size: 0.85rem; }
.hit { border: 1px solid var(--sq-border); border-radius: var(--sq-radius-lg); padding: 12px 14px; margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.row1 { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.path { font-size: 0.8rem; word-break: break-all; }
.ua { word-break: break-all; font-family: var(--sq-font-mono, ui-monospace, monospace); font-size: 0.75rem; }
.adminnav { padding-top: 20px; font-size: 0.85rem; color: var(--sq-on-surface-variant); }
.adminnav a { color: var(--sq-primary); text-decoration: none; }
</style>
