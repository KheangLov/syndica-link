<script setup lang="ts">
const route = useRoute()
const webBase = (useRuntimeConfig().public as any).webUrl as string
const slug = computed(() => String(route.params.slug))
const origin = useOrigin()

// Older share links had a version segment (/posts/<slug>/<version>); they still work and show the clean URL.
const version = computed(() => (route.params.version ? String(route.params.version) : ''))
if (version.value && !/^[a-f0-9]{6,40}$/.test(version.value)) throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })

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

const canonical = computed(() => `${origin}/posts/${post.value.slug}`) // the share link (og:url)
const webPage = computed(() => webUrlFor(`/posts/${post.value.slug}`, webBase)) // where the post lives (rel=canonical)
// The link to share is the clean canonical URL. Telegram and Facebook are told to re-fetch
// it automatically after each publish (see syndica-web's refresh workflow).
const shareUrl = canonical

// Readers who open a share link see the clean canonical URL in the address bar.
onMounted(() => {
  if (version.value) history.replaceState(history.state, '', `/posts/${post.value.slug}`)
})
const image = computed(() => postImage(post.value, origin))
// Which app is asking (from its user agent), and what that app should get — its Share-studio
// settings merged over the defaults: title, description, one image, large or compact card.
const requester = useRequester()
const share = computed(() => resolveShare(post.value as any, site.value, requester.value, origin, { assetBase: data.value!.assetBase }))
const shareImage = computed(() => share.value.image.url)
const author = computed(() => post.value.author || site.value.author?.name || site.value.name)

// ---------- SEO (rendered on the server — no JavaScript needed by bots) ----------
useSeoMeta({
  title: () => `${post.value.title} · ${site.value.name}`,
  description: () => post.value.description,
  author,
  ogType: 'article',
  ogSiteName: () => site.value.name,
  ogLocale: () => (post.value.lang === 'km' ? 'km_KH' : site.value.locale),
  ogTitle: () => share.value.title,
  ogDescription: () => share.value.description,
  ogUrl: canonical,
  ogImage: shareImage,
  ogImageSecureUrl: shareImage,
  ogImageType: () => share.value.image.type,
  ogImageWidth: () => share.value.image.width,
  ogImageHeight: () => share.value.image.height,
  ogImageAlt: () => share.value.image.alt,
  articlePublishedTime: () => post.value.date,
  articleModifiedTime: () => post.value.updated || post.value.date,
  articleAuthor: () => [author.value],
  articleTag: () => post.value.tags,
  twitterCard: () => share.value.twitterCard,
  twitterSite: () => site.value.twitter || undefined,
  twitterTitle: () => share.value.title,
  twitterDescription: () => share.value.description,
  // Same image everywhere on the page, so no app can fall back to the wide card (X's crawler gets the wide one anyway).
  twitterImage: shareImage,
  twitterImageAlt: () => share.value.image.alt,
})
useHead({
  htmlAttrs: { lang: () => post.value.lang || 'en' },
  link: [
    { rel: 'canonical', href: webPage },
    { rel: 'image_src', href: shareImage }, // older crawlers (VK, some chat apps) read this instead of og:image
  ],
  meta: [
    // Discord colours its embed stripe with theme-color: use the post's accent for crawlers.
    { name: 'theme-color', content: () => (requester.value === 'other' ? undefined : share.value.accent), key: 'theme-color-post', tagPriority: 'critical' },
    { name: 'telegram:channel', content: () => site.value.telegramChannel || undefined },
    // Which content version this response carries: the refresh waits until every app sees the new one.
    { name: 'syndica:version', content: () => post.value.version },
  ],
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.value.title,
      description: post.value.description,
      image: shareImage.value,
      datePublished: post.value.date,
      dateModified: post.value.updated || post.value.date,
      author: { '@type': 'Person', name: author.value },
      publisher: { '@type': 'Organization', name: site.value.name },
      mainEntityOfPage: webPage.value,
      inLanguage: post.value.lang || 'en',
      keywords: post.value.tags.join(', '),
    }),
  }],
})

const toast = inject<(t: string) => void>('toast', () => {})
async function copyShare() { if (await copyText(shareUrl.value)) toast('Link copied') }

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
          <NuxtLink v-for="t in post.tags" :key="t" :to="`/tags/${encodeURIComponent(t)}`" class="tag-link"><SqChip size="small" rounded="pill" link>#{{ t }}</SqChip></NuxtLink>
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
          <p class="muted">Send it to a chat or channel. Previews refresh automatically after every update.</p>
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
.tag-link { text-decoration: none; }
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
