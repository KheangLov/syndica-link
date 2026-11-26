<script setup lang="ts">
const { data, error } = await useFetch('/api/site', { key: 'site' })
if (error.value && !data.value) throw createError({ statusCode: 503, statusMessage: 'Content source unavailable', fatal: true })

const site = computed(() => data.value!.site)
const posts = computed(() => data.value!.posts)
useListingSeo({ site, posts, path: '/', title: computed(() => `${site.value.name} — ${site.value.tagline}`), description: computed(() => site.value.description) })
</script>

<template>
  <div class="wrap">
    <header class="hero">
      <span class="eyebrow">Telegram share testing</span>
      <h1 class="hero__title">{{ site.tagline }}</h1>
      <p class="hero__lead">{{ site.description }}</p>
    </header>
    <PostIndex :posts="posts" />
  </div>
</template>

<style scoped>
.hero { padding: 40px 0 28px; max-width: 760px; }
.hero__title { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; letter-spacing: -0.035em; margin: 12px 0 14px; font-weight: 750; text-wrap: balance; }
.hero__lead { font-size: 1.125rem; line-height: 1.6; color: var(--sq-on-surface-variant); margin: 0; max-width: 620px; }
</style>
