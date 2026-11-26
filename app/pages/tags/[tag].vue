<script setup lang="ts">
const route = useRoute()
const tag = computed(() => String(route.params.tag))
const { data, error } = await useFetch('/api/site', { key: 'site' })
if (error.value && !data.value) throw createError({ statusCode: 503, statusMessage: 'Content source unavailable', fatal: true })

const site = computed(() => data.value!.site)
const posts = computed(() => data.value!.posts)
const count = computed(() => posts.value.filter((p) => p.tags.includes(tag.value)).length)
if (!count.value) throw createError({ statusCode: 404, statusMessage: 'Tag not found', fatal: true })

useListingSeo({
  site, posts,
  path: `/tags/${encodeURIComponent(tag.value)}`,
  title: computed(() => `#${tag.value} · ${site.value.name}`),
  description: computed(() => `${count.value} post${count.value === 1 ? '' : 's'} tagged #${tag.value} on ${site.value.name}.`),
})
</script>

<template>
  <div class="wrap">
    <header class="hero">
      <NuxtLink to="/" class="eyebrow back">← All posts</NuxtLink>
      <h1 class="hero__title">#{{ tag }}</h1>
      <p class="hero__lead">{{ count }} post{{ count === 1 ? '' : 's' }}</p>
    </header>
    <PostIndex :posts="posts" :tag="tag" />
  </div>
</template>

<style scoped>
.hero { padding: 40px 0 20px; }
.back { text-decoration: none; }
.hero__title { font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.03em; margin: 12px 0 6px; }
.hero__lead { margin: 0; color: var(--sq-on-surface-variant); }
</style>
