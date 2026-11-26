<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const origin = useOrigin()

const { data, error, refresh } = await useFetch('/api/site', { key: 'site' })
if (error.value && !data.value) throw createError({ statusCode: 503, statusMessage: 'Content source unavailable', fatal: true })

const site = computed(() => data.value?.site)
const posts = computed(() => data.value?.posts || [])

// ---------- SEO (rendered on the server) ----------
const title = computed(() => `${site.value?.name} — ${site.value?.tagline}`)
const image = computed(() => `${origin}/og/default.png?v=${data.value?.ref?.slice(0, 10)}`)
useSeoMeta({
  title,
  description: () => site.value?.description,
  ogType: 'website',
  ogSiteName: () => site.value?.name,
  ogLocale: () => site.value?.locale,
  ogTitle: () => site.value?.name,
  ogDescription: () => site.value?.description,
  ogUrl: `${origin}/`,
  ogImage: image,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: title,
  twitterCard: 'summary_large_image',
  twitterSite: () => site.value?.twitter || undefined,
  twitterTitle: () => site.value?.name,
  twitterDescription: () => site.value?.description,
  twitterImage: image,
})
useHead({
  link: [{ rel: 'canonical', href: `${origin}/` }],
  meta: [{ name: 'telegram:channel', content: () => site.value?.telegramChannel || undefined }],
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Blog', name: site.value?.name, description: site.value?.description, url: `${origin}/`,
      blogPost: posts.value.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${origin}/posts/${p.slug}`, datePublished: p.date })),
    }),
  }],
})

// ---------- filters (kept in the URL) ----------
const query = ref(String(route.query.q || ''))
const tag = ref<string | null>(route.query.tag ? String(route.query.tag) : null)
watch([query, tag], ([q, t]) => router.replace({ query: { ...(q ? { q } : {}), ...(t ? { tag: t } : {}) } }))

const allTags = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of posts.value) for (const t of p.tags) counts[t] = (counts[t] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t)
})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return posts.value.filter((p) => (!tag.value || p.tags.includes(tag.value)) && (!q || [p.title, p.description, ...p.tags].join(' ').toLowerCase().includes(q)))
})
const isFiltering = computed(() => !!query.value.trim() || !!tag.value)
const featured = computed(() => (isFiltering.value ? null : filtered.value.find((p) => p.featured) || filtered.value[0]))
const rest = computed(() => filtered.value.filter((p) => p !== featured.value))
const reset = () => { query.value = ''; tag.value = null }
</script>

<template>
  <div class="wrap">
    <header class="hero">
      <span class="eyebrow">Telegram share testing</span>
      <h1 class="hero__title">{{ site?.tagline }}</h1>
      <p class="hero__lead">{{ site?.description }}</p>
    </header>

    <div class="toolbar">
      <SqTextField v-model="query" class="toolbar__search" placeholder="Search posts" prepend-inner-icon="search" clearable hide-details rounded="pill" aria-label="Search posts" />
      <SqChipGroup v-model="tag" class="toolbar__tags" aria-label="Filter by tag">
        <SqChip v-for="t in allTags" :key="t" :value="t" filter variant="outlined" rounded="pill">#{{ t }}</SqChip>
      </SqChipGroup>
    </div>

    <SqAlert v-if="error" type="warning" title="Showing the last loaded posts" :text="error.message">
      <template #append><SqBtn variant="text" @click="refresh()">Retry</SqBtn></template>
    </SqAlert>

    <SqEmptyState v-if="!filtered.length" icon="search" title="No posts match" text="Try a different word or clear the tag filter.">
      <template #actions><SqBtn variant="tonal" @click="reset">Clear filters</SqBtn></template>
    </SqEmptyState>

    <template v-else>
      <PostCard v-if="featured" :post="featured" featured class="featured" />
      <p v-if="isFiltering" class="muted result-count">{{ filtered.length }} post{{ filtered.length === 1 ? '' : 's' }}</p>
      <TransitionGroup name="list" tag="div" class="grid">
        <PostCard v-for="p in rest" :key="p.slug" :post="p" />
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped>
.hero { padding: 40px 0 28px; max-width: 760px; }
.hero__title { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; letter-spacing: -0.035em; margin: 12px 0 14px; font-weight: 750; text-wrap: balance; }
.hero__lead { font-size: 1.125rem; line-height: 1.6; color: var(--sq-on-surface-variant); margin: 0; max-width: 620px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; margin: 8px 0 28px; }
.toolbar__search { flex: 0 1 320px; min-width: 220px; }
.toolbar__tags { flex: 1; }
.featured { margin-bottom: 24px; }
.result-count { margin: -8px 0 16px; font-size: 0.9rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.list-move, .list-enter-active, .list-leave-active { transition: all 0.3s var(--sq-ease, ease); }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(0.97); }
.list-leave-active { position: absolute; }
</style>
