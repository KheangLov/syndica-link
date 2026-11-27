<script setup lang="ts">
// Share studio for one post: per-app settings, live mock previews, live checks and test tools.
import type { ShareSettings, ShareFields, PlatformKey, Layout } from '~/utils/share-meta'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
useSeoMeta({ title: () => `Share studio: ${slug.value} · Syndica admin`, robots: 'noindex, nofollow' })
const { password, call } = useAdmin()
const toast = inject<(t: string, icon?: string) => void>('toast', () => {})

type Tab = 'default' | PlatformKey | 'messenger'
const APPS: { key: Tab; name: string }[] = [
  { key: 'default', name: 'All apps' }, { key: 'telegram', name: 'Telegram' }, { key: 'facebook', name: 'Facebook' },
  { key: 'messenger', name: 'Messenger' }, { key: 'whatsapp', name: 'WhatsApp' }, { key: 'linkedin', name: 'LinkedIn' },
  { key: 'x', name: 'X' }, { key: 'discord', name: 'Discord' }, { key: 'slack', name: 'Slack' },
]
const PREVIEW_APPS = APPS.filter((a) => a.key !== 'default').map((a) => a.key as Exclude<Tab, 'default'>)

const data = ref<any>(null)
const loadError = ref('')
const draft = ref<ShareSettings>({})
const tab = ref<Tab>('default')

async function load() {
  loadError.value = ''
  try {
    data.value = await call('/api/admin/studio/post', { slug: slug.value })
    draft.value = JSON.parse(JSON.stringify(data.value.post.share || {}))
  } catch (e: any) { loadError.value = e.message }
}
watch(password, (p) => { if (p) load() }, { immediate: true })

const post = computed(() => data.value?.post)
const site = computed(() => data.value?.site)
const origin = computed(() => data.value?.origin || '')
const domain = computed(() => { try { return new URL(origin.value).host } catch { return '' } })
const shareUrl = computed(() => `${origin.value}/posts/${slug.value}`)
const dirty = computed(() => JSON.stringify(cleanShare(draft.value) || {}) !== JSON.stringify(cleanShare(post.value?.share || {}) || {}))

// ---------- editing the selected app's block ----------
const editKey = computed<keyof ShareSettings | null>(() => (tab.value === 'messenger' ? null : (tab.value as keyof ShareSettings)))
const block = computed<ShareFields>(() => {
  const k = editKey.value
  if (!k) return {}
  if (!draft.value[k]) draft.value[k] = {}
  return draft.value[k]!
})
const requesterFor = (k: Tab) => (k === 'default' ? 'search' : k === 'messenger' ? 'facebook' : k) as any
/** What this app would get if its own block were empty: the placeholder for each field. */
const inherited = computed(() => {
  if (!post.value || !editKey.value) return null
  const d = { ...draft.value, [editKey.value]: {} }
  return resolveShare(post.value, site.value, requesterFor(tab.value), origin.value, { assetBase: data.value.assetBase, draft: d })
})
const layoutItems = computed(() => [
  { title: `Inherit (${inherited.value?.layout === 'compact' ? 'small thumbnail' : 'large image'})`, value: 'inherit' },
  { title: 'Large image', value: 'large' },
  { title: 'Small thumbnail (compact)', value: 'compact' },
])
const imageItems = computed(() => [{ title: inherited.value?.customImage ? 'Inherit (custom image)' : 'Inherit (generated card)', value: 'inherit' }, ...(data.value?.images || []).map((p: string) => ({ title: p.replace('/images/', ''), value: p }))])
const blockHasValues = computed(() => Object.values(block.value).some((v) => v))
function resetBlock() { if (editKey.value) draft.value[editKey.value] = {} }

// ---------- previews: resolve each app from the draft, draw generated images via the API ----------
const resolved = (app: Exclude<Tab, 'default'>) =>
  post.value ? resolveShare(post.value, site.value, requesterFor(app), origin.value, { assetBase: data.value.assetBase, draft: draft.value }) : null
const images = reactive<Record<string, string>>({})
const drawing = reactive<Record<string, boolean>>({})
let timer: any
function drawKey(app: Exclude<Tab, 'default'>) {
  const r = resolved(app)
  if (!r || r.image.kind === 'cover') return null
  return JSON.stringify([r.imageKey, r.layout, draft.value.default || {}, draft.value[r.imageKey as keyof ShareSettings] || {}])
}
async function drawAll() {
  for (const app of PREVIEW_APPS) {
    const r = resolved(app)
    const key = drawKey(app)
    if (!r || !key || images[key] || drawing[key]) continue
    drawing[key] = true
    call<{ dataUrl: string }>('/api/admin/studio/render', { slug: slug.value, key: r.imageKey, square: r.layout === 'compact' ? 1 : 0, draft: draft.value })
      .then((res) => { images[key] = res.dataUrl })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => { drawing[key] = false })
  }
}
watch([draft, data], () => { clearTimeout(timer); timer = setTimeout(drawAll, 500) }, { deep: true, immediate: true })
function previewProps(app: Exclude<Tab, 'default'>) {
  const r = resolved(app)!
  const key = drawKey(app)
  return {
    app, siteName: r.siteName, domain: domain.value, title: r.title, description: r.description, layout: r.layout,
    image: r.image.kind === 'cover' ? r.image.url : key ? images[key] : undefined,
    loading: !!(key && !images[key]),
  }
}
const shownApps = computed(() => (tab.value === 'default' ? PREVIEW_APPS : [tab.value as Exclude<Tab, 'default'>]))

// ---------- save, refresh ----------
const saving = ref(false)
// After saving: watch the real share link until every app gets the new version.
const publish = ref<null | { commit: string; commitUrl: string; version: string; apps: { app: string; ok: boolean }[]; done: boolean; timedOut: boolean }>(null)
let pollTimer: any
async function pollLive(startedAt: number) {
  if (!publish.value) return
  try {
    const r = await call<any>('/api/admin/studio/live', { slug: slug.value, version: publish.value.version })
    publish.value.apps = r.apps
    if (r.apps.every((a: any) => a.ok)) {
      publish.value.done = true
      if (publish.value.commit) load() // only after a save; never wipe unsaved edits
      return
    }
  } catch {}
  if (Date.now() - startedAt > 120_000) { publish.value.timedOut = true; return }
  pollTimer = setTimeout(() => pollLive(startedAt), 3000)
}
onBeforeUnmount(() => clearTimeout(pollTimer))
async function save() {
  saving.value = true
  try {
    const r = await call<any>('/api/admin/studio/save', { slug: slug.value, share: draft.value })
    if (r.unchanged) { toast('Nothing changed'); return }
    publish.value = { commit: r.commit, commitUrl: r.commitUrl, version: r.version, apps: [], done: false, timedOut: false }
    clearTimeout(pollTimer)
    pollLive(Date.now())
  } catch (e: any) { toast(e.message, 'error') } finally { saving.value = false }
}
async function checkLiveNow() {
  publish.value = { commit: '', commitUrl: '', version: post.value.version, apps: [], done: false, timedOut: false }
  clearTimeout(pollTimer)
  pollLive(Date.now())
}
const refreshing = ref(false)
const refreshReport = ref<string[]>([])
async function refreshApps() {
  refreshing.value = true
  try { refreshReport.value = (await call<any>('/api/admin/studio/refresh', { slug: slug.value })).report } catch (e: any) { toast(e.message, 'error') } finally { refreshing.value = false }
}

// ---------- live check (what's live now, fetched as the app's crawler) ----------
const checkApp = ref<PlatformKey>('whatsapp')
watch(tab, (t) => { if (t !== 'default') checkApp.value = (t === 'messenger' ? 'facebook' : t) as PlatformKey })
const checking = ref(false)
const check = ref<any>(null)
async function runCheck() {
  checking.value = true
  check.value = null
  try { check.value = await call('/api/admin/studio/inspect', { slug: slug.value, platform: checkApp.value }) } catch (e: any) { toast(e.message, 'error') } finally { checking.value = false }
}
const checkIcon = { pass: 'success', warn: 'warning', fail: 'error' } as const

// ---------- testing tools ----------
const freshLink = ref('')
const newFreshLink = () => { freshLink.value = `${shareUrl.value}/${Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')}` }
watch(shareUrl, newFreshLink)
onMounted(newFreshLink)
const openIn = computed(() => {
  const u = encodeURIComponent(freshLink.value), t = encodeURIComponent(post.value?.title || '')
  return [
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${u}` },
    { label: 'Messenger', href: `fb-messenger://share/?link=${u}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
  ]
})
const debugTools = computed(() => [
  { label: 'Facebook Sharing Debugger', href: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shareUrl.value)}` },
  { label: 'LinkedIn Post Inspector', href: `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(shareUrl.value)}` },
  { label: '@WebpageBot (Telegram)', href: 'https://t.me/WebpageBot' },
])
async function copy(text: string, what = 'Copied') { if (await copyText(text)) toast(what) }
const appName = (k: string) => APPS.find((a) => a.key === k)?.name || k
const info = (k: Tab) => (k === 'default' || k === 'messenger' ? null : platformInfo(k as PlatformKey))
</script>

<template>
  <AdminShell wide :title="post ? post.title : 'Share studio'" subtitle="Change how this post looks on each app, see it live, and test with fresh links. Unsaved changes show in the previews only.">
    <SqAlert v-if="loadError" type="error" :text="loadError" />
    <div v-else-if="!post" class="muted">Loading…</div>
    <template v-else>
      <!-- top bar -->
      <div class="bar">
        <NuxtLink to="/admin/studio" class="muted back">← All posts</NuxtLink>
        <a :href="webUrlFor(`/posts/${slug}`)" target="_blank" rel="noopener" class="muted">Open on syndica-web ↗</a>
        <span class="grow" />
        <SqChip v-if="dirty" color="warning" variant="tonal" size="small">Unsaved changes</SqChip>
        <SqBtn variant="text" size="small" prepend-icon="refresh" @click="checkLiveNow">Live status</SqBtn>
        <SqBtn variant="text" :disabled="!dirty" @click="load">Discard</SqBtn>
        <SqBtn :loading="saving" :disabled="!dirty || !data.canSave" @click="save">Save & publish</SqBtn>
      </div>
      <SqSheet v-if="publish" border rounded="xl" class="panel mb publish">
        <div class="panel__title">
          <h2 class="section-title">
            {{ publish.done ? 'Live everywhere' : publish.timedOut ? 'Still waiting on some apps' : publish.commit ? 'Publishing your changes…' : 'Checking the live link…' }}
          </h2>
          <a v-if="publish.commitUrl" :href="publish.commitUrl" target="_blank" rel="noopener" class="small">Commit {{ publish.commit }} ↗</a>
        </div>
        <div class="links">
          <SqChip v-for="a in data.platforms" :key="a.key" size="small" :color="publish.apps.find((x) => x.app === a.key)?.ok ? 'success' : undefined" variant="tonal" :prepend-icon="publish.apps.find((x) => x.app === a.key)?.ok ? 'check' : 'clock'">{{ a.name }}</SqChip>
        </div>
        <p class="muted small">
          <template v-if="publish.done">Every app now gets version <code>{{ publish.version }}</code> from {{ shareUrl }}.<template v-if="publish.commit"> Telegram, Facebook and Messenger are being refreshed in the background; new shares use the new card straight away.</template></template>
          <template v-else-if="publish.timedOut">Some apps still got an older version after 2 minutes. Check that the GitHub token is set in Vercel, then press Check again.</template>
          <template v-else>Waiting until the live share link serves version <code>{{ publish.version }}</code> to every app. This usually takes 5–20 seconds.</template>
        </p>
        <div class="links"><SqBtn v-if="publish.done || publish.timedOut" size="small" variant="text" @click="publish = null">Close</SqBtn><SqBtn v-if="publish.timedOut" size="small" variant="tonal" @click="checkLiveNow">Check again</SqBtn></div>
      </SqSheet>
      <SqAlert v-if="!data.canSave" type="info" variant="tonal" class="mb" text="Saving needs NUXT_GITHUB_WRITE_TOKEN in Vercel: a fine-grained GitHub token with Contents read & write on syndica-web. Previews and checks work without it." />

      <SqTabs v-model="tab" :items="APPS.map((a) => ({ title: a.name, value: a.key }))" class="tabs" />

      <div class="grid">
        <!-- editor -->
        <section class="col">
          <SqSheet border rounded="xl" class="panel">
            <template v-if="tab === 'messenger'">
              <h2 class="section-title">Messenger</h2>
              <p class="muted small">Messenger has no settings of its own. When Meta's servers fetch the link it uses <strong>Facebook's</strong> settings; when the sender's phone fetches it, it uses <strong>WhatsApp's</strong>. Messenger always draws the image full width, so keep both looking good large.</p>
              <div class="links"><SqBtn size="small" variant="tonal" @click="tab = 'facebook'">Edit Facebook</SqBtn><SqBtn size="small" variant="tonal" @click="tab = 'whatsapp'">Edit WhatsApp</SqBtn></div>
            </template>
            <template v-else>
              <div class="panel__title">
                <h2 class="section-title">{{ tab === 'default' ? 'All apps (defaults)' : appName(tab) }}</h2>
                <SqBtn v-if="blockHasValues" variant="text" size="small" @click="resetBlock">Reset</SqBtn>
              </div>
              <p class="muted small">{{ tab === 'default' ? 'Used by every app unless it has its own value. Empty fields use the post.' : `${info(tab)?.rule} Empty fields inherit from All apps.` }}</p>
              <SqSelect :model-value="block.layout || 'inherit'" :items="layoutItems" label="Card" hide-details @update:model-value="(v: any) => (block.layout = v === 'inherit' ? '' : v)" />
              <SqTextField v-model="block.title" label="Title" :placeholder="inherited?.title" :counter="info(tab)?.titleMax" persistent-placeholder />
              <SqTextarea v-model="block.description" label="Description" :placeholder="inherited?.description" :rows="3" auto-grow :counter="info(tab)?.descMax" persistent-placeholder />
              <SqSelect :model-value="(data.images || []).includes(block.image) ? block.image : 'inherit'" :items="imageItems" label="Image" @update:model-value="(v: any) => (block.image = v === 'inherit' ? '' : v)" hint="An image from syndica-web. Large card: shown as is. Small thumbnail: cropped to a square." persistent-hint />
              <SqTextField v-model="block.image" label="…or image URL / path" placeholder="https://… or /images/…" hide-details />
              <div class="row2">
                <div class="color">
                  <label class="small muted">Accent colour</label>
                  <div class="color__row"><input type="color" :value="block.accent || inherited?.accent || '#2AABEE'" @input="block.accent = ($event.target as HTMLInputElement).value"><SqTextField v-model="block.accent" :placeholder="inherited?.accent" hide-details density="compact" /></div>
                </div>
                <SqTextField v-model="block.label" label="Tile label" :placeholder="inherited?.label || `#${post.tags[0] || ''}`" hint="Small text on the square thumbnail" persistent-hint />
              </div>
            </template>
          </SqSheet>

          <!-- testing tools -->
          <SqSheet border rounded="xl" class="panel">
            <h2 class="section-title">Test in the real apps</h2>
            <p class="muted small">Apps keep the first preview they see for a link, so test with a link they have never seen. Each fresh link opens the same post.</p>
            <div class="fresh">
              <code>{{ freshLink }}</code>
              <SqBtn size="small" variant="text" prepend-icon="copy" @click="copy(freshLink, 'Fresh link copied')">Copy</SqBtn>
              <SqBtn size="small" variant="text" prepend-icon="refresh" @click="newFreshLink">New</SqBtn>
            </div>
            <div class="links"><SqBtn v-for="o in openIn" :key="o.label" size="small" variant="tonal" :href="o.href" target="_blank" rel="noopener">{{ o.label }}</SqBtn></div>
            <SqDivider />
            <div class="panel__title">
              <span class="small"><strong>Shared link:</strong> <a :href="shareUrl" target="_blank" rel="noopener">{{ shareUrl }}</a></span>
              <SqBtn size="small" variant="text" prepend-icon="copy" @click="copy(shareUrl, 'Link copied')">Copy</SqBtn>
            </div>
            <div class="links">
              <SqBtn size="small" :loading="refreshing" prepend-icon="refresh" @click="refreshApps">Refresh apps now</SqBtn>
              <SqBtn v-for="d in debugTools" :key="d.label" size="small" variant="text" :href="d.href" target="_blank" rel="noopener">{{ d.label }} ↗</SqBtn>
            </div>
            <ul v-if="refreshReport.length" class="report small"><li v-for="(l, i) in refreshReport" :key="i">{{ l }}</li></ul>
          </SqSheet>
        </section>

        <!-- previews + live check -->
        <section class="col col--preview">
          <SqSheet border rounded="xl" class="panel">
            <h2 class="section-title">{{ tab === 'default' ? 'Preview in every app' : `Preview in ${appName(tab)}` }}</h2>
            <p class="muted small">Approximate mock from your current settings (unsaved included). Real apps vary a little by version and device.</p>
            <div class="previews">
              <div v-for="app in shownApps" :key="app" class="pv">
                <div class="pv__head small"><strong>{{ appName(app) }}</strong><span class="muted">{{ resolved(app)?.layout === 'compact' ? 'small thumbnail' : 'large image' }}</span></div>
                <div class="pv__stage" :class="`pv__stage--${app}`"><SharePreview v-bind="previewProps(app)" /></div>
              </div>
            </div>
          </SqSheet>

          <SqSheet border rounded="xl" class="panel">
            <div class="panel__title">
              <h2 class="section-title">Live check</h2>
              <div class="links">
                <SqSelect v-model="checkApp" :items="data.platforms.map((p: any) => ({ title: p.name, value: p.key }))" hide-details density="compact" class="check-select" />
                <SqBtn :loading="checking" @click="runCheck">Check</SqBtn>
              </div>
            </div>
            <p class="muted small">Fetches the live page exactly as {{ appName(checkApp) }}'s crawler does and checks it against {{ appName(checkApp) }}'s rules. Shows what's published, not unsaved changes.</p>
            <template v-if="check">
              <ul class="checks">
                <li v-for="(c, i) in check.checks" :key="i" class="check">
                  <SqIcon :icon="checkIcon[c.status as 'pass']" :color="c.status === 'pass' ? 'success' : c.status === 'warn' ? 'warning' : 'error'" size="small" />
                  <div><div class="check__label">{{ c.label }}</div><div class="muted small">{{ c.detail }}</div></div>
                </li>
              </ul>
              <div class="pv__stage" :class="`pv__stage--${check.app}`">
                <SharePreview :app="check.app" :site-name="check.preview.siteName" :domain="domain" :title="check.preview.title" :description="check.preview.description" :image="check.preview.image" :layout="check.checks.find((c: any) => c.label.startsWith('Will show'))?.detail.startsWith('compact') ? 'compact' : 'large'" />
              </div>
              <details class="tags">
                <summary class="small">Tags {{ appName(check.app) }} received ({{ check.tags.length }})</summary>
                <dl><template v-for="(t, i) in check.tags" :key="i"><dt>{{ t.key }}</dt><dd>{{ t.value }}</dd></template></dl>
              </details>
            </template>
          </SqSheet>
        </section>
      </div>
    </template>
  </AdminShell>
</template>

<style scoped>
.publish code { font-size: 0.85em; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; font-size: 0.9rem; }
.bar a { text-decoration: none; }
.grow { flex: 1; }
.mb { margin-bottom: 14px; }
.tabs { margin-bottom: 18px; overflow-x: auto; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 20px; align-items: start; }
@media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
.col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
@media (max-width: 960px) { .col--preview { order: -1; } }
.panel { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.panel__title { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.panel__title .section-title, .panel > .section-title { margin: 0; }
.small { font-size: 0.85rem; }
.panel p { margin: 0; line-height: 1.5; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 520px) { .row2 { grid-template-columns: 1fr; } }
.color { display: flex; flex-direction: column; gap: 6px; }
.color__row { display: flex; gap: 8px; align-items: center; }
.color input[type='color'] { width: 40px; height: 40px; border: 0; padding: 0; background: none; cursor: pointer; flex: none; }
.links { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.fresh { display: flex; align-items: center; gap: 4px; min-width: 0; }
.fresh code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; padding: 8px 10px; border-radius: var(--sq-radius-md); background: var(--sq-surface-variant); }
.report { margin: 0; padding-left: 1.1em; color: var(--sq-on-surface-variant); }
.previews { display: flex; flex-direction: column; gap: 16px; }
.pv { display: flex; flex-direction: column; gap: 6px; }
.pv__head { display: flex; gap: 8px; align-items: baseline; }
.pv__stage { padding: 14px; border-radius: var(--sq-radius-lg); background: #e5ddd5; }
.pv__stage--telegram { background: #c7d9b8; }
.pv__stage--facebook, .pv__stage--messenger { background: #18191a; }
.pv__stage--whatsapp { background: #efeae2; }
.pv__stage--linkedin { background: #f4f2ee; }
.pv__stage--x, .pv__stage--slack { background: #fff; border: 1px solid var(--sq-border); }
.pv__stage--discord { background: #313338; }
.check-select { min-width: 150px; }
.checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.check { display: grid; grid-template-columns: 22px 1fr; gap: 8px; }
.check__label { font-weight: 600; font-size: 0.9rem; }
.tags summary { cursor: pointer; }
.tags dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; font: 0.75rem/1.5 var(--sq-font-mono, ui-monospace, monospace); margin: 10px 0 0; }
.tags dt { color: var(--sq-primary); }
.tags dd { margin: 0; word-break: break-all; color: var(--sq-on-surface-variant); }
</style>
