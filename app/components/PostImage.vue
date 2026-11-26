<script setup lang="ts">
// Plain <img> on purpose: it's in the server HTML and visible without JavaScript,
// so a server-rendered page can never show an empty image box.
defineProps<{ src: string; alt?: string; ratio?: number | string; eager?: boolean; rounded?: string }>()
</script>

<template>
  <div class="pimg" :class="`pimg--${rounded || 'lg'}`" :style="ratio ? { aspectRatio: String(ratio) } : undefined">
    <img :src="src" :alt="alt || ''" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'high' : undefined" decoding="async">
  </div>
</template>

<style scoped>
.pimg { position: relative; overflow: hidden; background: var(--sq-surface-variant); corner-shape: squircle; }
.pimg--lg { border-radius: var(--sq-radius-lg); }
.pimg--xl { border-radius: var(--sq-radius-xl); }
.pimg img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pimg:not([style]) img { height: auto; }
</style>
