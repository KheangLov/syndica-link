<script setup lang="ts">
// Admin frame: nav between admin pages, and the password gate.
defineProps<{ title: string; subtitle?: string; wide?: boolean }>()
const { password, setPassword, call } = useAdmin()
const typed = ref('')
const error = ref('')
const checking = ref(false)
async function signIn() {
  checking.value = true
  error.value = ''
  setPassword(typed.value)
  try { await call('/api/admin/hits') } catch (e: any) { error.value = e.message; setPassword('') } finally { checking.value = false }
}
const route = useRoute()
const nav = [
  { to: '/admin/studio', label: 'Share studio' },
  { to: '/admin/previews', label: 'Preview log' },
  { to: '/admin/telegram', label: 'Telegram login' },
]
</script>

<template>
  <div class="wrap admin" :class="{ 'admin--wide': wide }">
    <nav class="admin__nav">
      <NuxtLink v-for="n in nav" :key="n.to" :to="n.to" class="admin__link" :class="{ on: route.path.startsWith(n.to) }">{{ n.label }}</NuxtLink>
      <SqBtn v-if="password" variant="text" size="small" class="admin__out" @click="setPassword('')">Sign out</SqBtn>
    </nav>
    <header class="admin__head">
      <span class="eyebrow">Admin</span>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="muted">{{ subtitle }}</p>
    </header>
    <ClientOnly>
      <form v-if="!password" class="gate" @submit.prevent="signIn">
        <SqTextField v-model="typed" type="password" label="Admin password" hint="NUXT_ADMIN_PASSWORD from Vercel" persistent-hint autocomplete="current-password" />
        <SqBtn type="submit" :loading="checking">Sign in</SqBtn>
        <SqAlert v-if="error" type="error" :text="error" />
      </form>
      <slot v-else />
    </ClientOnly>
  </div>
</template>

<style scoped>
.admin { max-width: 760px; padding-bottom: 40px; }
.admin--wide { max-width: var(--page-max); }
.admin__nav { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; padding-top: 20px; }
.admin__link { padding: 6px 12px; border-radius: 999px; font-size: 0.875rem; font-weight: 600; text-decoration: none; color: var(--sq-on-surface-variant); }
.admin__link.on { color: var(--sq-primary); background: color-mix(in srgb, var(--sq-primary) 12%, transparent); }
.admin__out { margin-left: auto; }
.admin__head { padding: 18px 0 20px; }
.admin__head h1 { font-size: clamp(1.7rem, 4vw, 2.2rem); letter-spacing: -0.03em; margin: 6px 0; }
.admin__head p { margin: 0; line-height: 1.55; }
.gate { display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
</style>
