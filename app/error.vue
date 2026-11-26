<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({ title: () => (notFound.value ? 'Not found · Syndica' : 'Something went wrong · Syndica'), robots: 'noindex' })
</script>

<template>
  <SqApp>
    <div class="wrap err">
      <SqEmptyState
        :icon="notFound ? 'search' : 'error'"
        :title="notFound ? 'Page not found' : 'Something went wrong'"
        :text="notFound ? 'The post may have been renamed or unpublished.' : error.statusMessage || error.message"
      >
        <template #actions><SqBtn :prepend-icon="icons.arrowLeft" @click="clearError({ redirect: '/' })">Back to posts</SqBtn></template>
      </SqEmptyState>
    </div>
  </SqApp>
</template>

<style scoped>
.err { padding-top: 120px; }
</style>
