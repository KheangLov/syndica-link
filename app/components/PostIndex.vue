<script setup lang="ts">
// Post list shared by "/" and "/tags/<tag>". Tag filters are real paths (no query strings);
// search is instant and stays on the page.
type Summary = { slug: string; title: string; description: string; tags: string[]; featured?: boolean; [k: string]: any }
const props = defineProps<{ posts: Summary[]; tag?: string | null }>()

const query = ref('')
const allTags = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of props.posts) for (const t of p.tags) counts[t] = (counts[t] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t)
})
const selected = computed({
  get: () => props.tag || null,
  set: (t) => navigateTo(t ? `/tags/${encodeURIComponent(t)}` : '/'),
})
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.posts.filter((p) => (!props.tag || p.tags.includes(props.tag)) && (!q || [p.title, p.description, ...p.tags].join(' ').toLowerCase().includes(q)))
})
const isFiltering = computed(() => !!query.value.trim() || !!props.tag)
const featured = computed(() => (isFiltering.value ? null : filtered.value.find((p) => p.featured) || filtered.value[0]))
const rest = computed(() => filtered.value.filter((p) => p !== featured.value))
function reset() { query.value = ''; if (props.tag) navigateTo('/') }
</script>

<template>
  <div>
    <div class="toolbar">
      <SqTextField v-model="query" class="toolbar__search" placeholder="Search posts" prepend-inner-icon="search" clearable hide-details rounded="pill" aria-label="Search posts" />
      <SqChipGroup v-model="selected" class="toolbar__tags" aria-label="Filter by tag">
        <SqChip v-for="t in allTags" :key="t" :value="t" filter variant="outlined" rounded="pill">#{{ t }}</SqChip>
      </SqChipGroup>
    </div>

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
