import type { ComputedRef } from 'vue'

/** Server-rendered SEO/social tags for list pages (home, tag pages). */
export function useListingSeo(o: { site: ComputedRef<any>; posts: ComputedRef<any[]>; path: string; title: ComputedRef<string>; description: ComputedRef<string> }) {
  const origin = useOrigin()
  const url = `${origin}${o.path === '/' ? '/' : o.path}`
  // Version in the path, not a query string: changes whenever any post changes.
  const image = computed(() => `${origin}/og/default/${hashList(o.posts.value)}.png`)
  useSeoMeta({
    title: o.title,
    description: o.description,
    ogType: 'website',
    ogSiteName: () => o.site.value.name,
    ogLocale: () => o.site.value.locale,
    ogTitle: o.title,
    ogDescription: o.description,
    ogUrl: url,
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: o.title,
    twitterCard: 'summary_large_image',
    twitterSite: () => o.site.value.twitter || undefined,
    twitterTitle: o.title,
    twitterDescription: o.description,
    twitterImage: image,
  })
  useHead({
    link: [{ rel: 'canonical', href: url }],
    meta: [{ name: 'telegram:channel', content: () => o.site.value.telegramChannel || undefined }],
    script: [{
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Blog', name: o.site.value.name, description: o.description.value, url,
        blogPost: o.posts.value.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${origin}/posts/${p.slug}`, datePublished: p.date })),
      }),
    }],
  })
}

const hashList = (posts: { version: string }[]) => {
  let h = 0
  for (const c of posts.map((p) => p.version).join('')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h.toString(16).padStart(8, '0')
}
