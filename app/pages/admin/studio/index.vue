<script setup lang="ts">
useSeoMeta({ title: 'Share studio · Syndica admin', robots: 'noindex, nofollow' })
const { data } = await useFetch('/api/site', { key: 'site', server: false })
const posts = computed(() => data.value?.posts || [])
const customised = (p: any) => Object.keys(p.share || {}).filter((k) => Object.values(p.share[k] || {}).some(Boolean))
</script>

<template>
  <AdminShell title="Share studio" subtitle="Choose a post to preview, test and change how it looks when shared on Telegram, Facebook, Messenger, WhatsApp, LinkedIn, X, Discord and Slack.">
    <div class="list">
      <NuxtLink v-for="p in posts" :key="p.slug" :to="`/admin/studio/${p.slug}`" class="row">
        <img :src="p.image || `/og/${p.slug}/${p.version}/default-sq256.jpg`" alt="" class="row__img">
        <div class="row__text">
          <div class="row__title">{{ p.title }}</div>
          <div class="row__meta muted">/posts/{{ p.slug }} · {{ p.date }}</div>
          <div v-if="customised(p).length" class="row__chips">
            <SqChip v-for="k in customised(p)" :key="k" size="small" variant="tonal">{{ k === 'default' ? 'all apps' : k }}</SqChip>
          </div>
        </div>
        <SqIcon icon="chevronRight" class="muted" />
      </NuxtLink>
    </div>
  </AdminShell>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; gap: 14px; align-items: center; padding: 10px 12px; border: 1px solid var(--sq-border); border-radius: var(--sq-radius-lg); text-decoration: none; color: inherit; }
.row:hover { border-color: var(--sq-primary); }
.row__img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; flex: none; background: var(--sq-surface-variant); }
.row__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.row__title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__meta { font-size: 0.8rem; }
.row__chips { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
