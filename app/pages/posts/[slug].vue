<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const origin = useOrigin()

const { data, error } = await useFetch(() => `/api/posts/${slug.value}`, { key: () => `post:${slug.value}` })
if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusCode === 404 ? 'Post not found' : 'Couldn’t load this post',
    fatal: true,
  })
}
const { data: index } = await useFetch('/api/site', { key: 'site' })

const post = computed(() => data.value!.post)
const site = computed(() => data.value!.site)

const canonical = computed(() => `${origin}/posts/${post.value.slug}`)
// The link to share: the version changes with the content, so Telegram treats an
// edited post as a new URL and fetches a fresh preview instead of its cached one.
const shareUrl = computed(() => `${canonical.value}?v=${post.value.version}`)
const image = computed(() => postImage(post.value, origin))
const author = computed(() => post.value.author || site.value.author?.name || site.value.name)

// ---------- SEO (rendered on the server — no JavaScript needed by bots) ----------
useSeoMeta({
  title: () => `${post.value.title} · ${site.value.name}`,
  description: () => post.value.description,
  author,
  ogType: 'article',
  ogSiteName: () => site.value.name,
  ogLocale: () => (post.value.lang === 'km' ? 'km_KH' : site.value.locale),
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.description,
  ogUrl: canonical,
  ogImage: image,
  ogImageSecureUrl: image,
  ogImageType: () => (post.value.image ? undefined : 'image/png'),
  ogImageWidth: () => (post.value.image ? undefined : 1200),
  ogImageHeight: () => (post.value.image ? undefined : 630),
  ogImageAlt: () => post.value.imageAlt,
  articlePublishedTime: () => post.value.date,
  articleModifiedTime: () => post.value.updated || post.value.date,
  articleAuthor: () => [author.value],
  articleTag: () => post.value.tags,
  twitterCard: 'summary_large_image',
  twitterSite: () => site.value.twitter || undefined,
  twitterTitle: () => post.value.title,
  twitterDescription: () => post.value.description,
  twitterImage: image,
  twitterImageAlt: () => post.value.imageAlt,
})
useHead({
  htmlAttrs: { lang: () => post.value.lang || 'en' },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ name: 'telegram:channel', content: () => site.value.telegramChannel || undefined }],
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.value.title,
      description: post.value.description,
      image: image.value,
      datePublished: post.value.date,
      dateModified: post.value.updated || post.value.date,
      author: { '@type': 'Person', name: author.value },
      publisher: { '@type': 'Organization', name: site.value.name },
      mainEntityOfPage: canonical.value,
      inLanguage: post.value.lang || 'en',
      keywords: post.value.tags.join(', '),
    }),
  }],
})

const toast = inject<(t: string) => void>('toast', () => {})
async function copyShare() { if (await copyText(shareUrl.value)) toast('Fresh share link copied') }

const related = computed(() => {
  const p = post.value
  const score = (x: { tags: string[] }) => x.tags.filter((t) => p.tags.includes(t)).length
  return (index.value?.posts || []).filter((x) => x.slug !== p.slug).sort((a, b) => score(b) - score(a)).slice(0, 2)
})
</script>

<template>
  <div class="wrap">
    <article class="article" :lang="post.lang || 'en'">
      <SqBtn to="/" variant="text" size="small" :prepend-icon="icons.arrowLeft" class="back">All posts</SqBtn>

      <header>
        <div class="article__tags">
          <SqChip v-for="t in post.tags" :key="t" :to="{ path: '/', query: { tag: t } }" size="small" rounded="pill" link>#{{ t }}</SqChip>
        </div>
        <h1 class="article__title">{{ post.title }}</h1>
        <p class="article__lead">{{ post.description }}</p>
        <div class="article__byline">
          <SqAvatar :name="author" :image="site.author?.avatar || undefined" size="small" />
          <div class="meta-row">
            <span class="author">{{ author }}</span>
            <span class="dot"><time :datetime="post.date">{{ formatDate(post.date) }}</time></span>
            <span class="dot"><SqIcon :icon="icons.clock" size="x-small" /> {{ post.readingTime }} min read</span>
          </div>
        </div>
      </header>

      <PostImage :src="image" :alt="post.imageAlt" ratio="1.905" rounded="xl" eager class="article__cover" />

      <div class="article__share-top"><ShareBar :url="shareUrl" :title="post.title" /></div>

      <BlockRenderer :blocks="post.blocks" :asset-base="data!.assetBase" />

      <SqSheet border rounded="xl" class="share-box">
        <div>
          <h2 class="section-title">Share this post</h2>
          <p class="muted">This link always shows the latest version in Telegram — edits get a new link, so the preview is never stale.</p>
        </div>
        <ShareBar :url="shareUrl" :title="post.title" />
        <div class="share-box__link">
          <code>{{ shareUrl }}</code>
          <SqBtn size="small" variant="text" prepend-icon="copy" @click="copyShare">Copy</SqBtn>
        </div>
      </SqSheet>
    </article>

    <section v-if="related.length" class="related">
      <h2 class="section-title">Keep reading</h2>
      <div class="related__grid"><PostCard v-for="p in related" :key="p.slug" :post="p" /></div>
    </section>
  </div>
</template>

<style scoped>
.article { max-width: var(--prose-max); margin: 0 auto; padding-top: 12px; }
.back { margin-left: -10px; margin-bottom: 20px; }
.article__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.article__title { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.08; letter-spacing: -0.035em; margin: 16px 0 14px; font-weight: 750; text-wrap: balance; }
.article__title:lang(km) { line-height: 1.45; letter-spacing: 0; }
.article__lead { font-size: 1.2rem; line-height: 1.55; color: var(--sq-on-surface-variant); margin: 0 0 22px; }
.article__byline { display: flex; align-items: center; gap: 12px; }
.author { font-weight: 600; color: var(--sq-on-background); }
.article__cover { margin: 32px -40px 0; box-shadow: var(--sq-elevation-2); }
@media (max-width: 800px) { .article__cover { margin: 28px 0 0; } }
.article__share-top { margin: 24px 0 36px; }
.share-box { margin-top: 48px; padding: 24px; display: flex; flex-direction: column; gap: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tg) 9%, var(--sq-surface)), var(--sq-surface) 60%); }
.share-box p { margin: 0; }
.share-box .section-title { margin-bottom: 4px; }
.share-box__link { display: flex; align-items: center; gap: 8px; min-width: 0; }
.share-box__link code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; padding: 8px 12px; border-radius: var(--sq-radius-md); background: var(--sq-surface-variant); }
.related { max-width: 960px; margin: 72px auto 0; }
.related__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
</style>
