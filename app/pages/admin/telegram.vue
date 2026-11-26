<script setup lang="ts">
// One-time Telegram login → session string for the @WebpageBot auto-refresh.
// Nothing is stored on the server; the session is shown once, here.
useSeoMeta({ title: 'Telegram login · Syndica admin', robots: 'noindex, nofollow' })

const step = ref<'start' | 'code' | 'done'>('start')
const form = reactive({ password: '', apiId: '', apiHash: '', phone: '+855', code: '', twoFa: '' })
const needPassword = ref(false)
const via = ref('app')
const loading = ref(false)
const error = ref('')
const result = ref({ session: '', account: '' })
const toast = inject<(t: string) => void>('toast', () => {})

async function call<T>(url: string, body: object): Promise<T | null> {
  loading.value = true
  error.value = ''
  try {
    return await $fetch<T>(url, { method: 'POST', body })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Something went wrong'
    return null
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  const r = await call<{ via: string }>('/api/admin/telegram/send-code', { password: form.password, apiId: form.apiId, apiHash: form.apiHash, phone: form.phone })
  if (r) { via.value = r.via; step.value = 'code' }
}

async function signIn() {
  const r = await call<{ ok: boolean; needPassword?: boolean; session?: string; account?: string }>('/api/admin/telegram/sign-in', { password: form.password, code: form.code, twoFa: form.twoFa || undefined })
  if (!r) return
  if (r.needPassword) { needPassword.value = true; return }
  result.value = { session: r.session!, account: r.account || '' }
  form.code = ''; form.twoFa = ''
  step.value = 'done'
}

async function copy() {
  if (await copyText(result.value.session)) toast('Session copied — paste it into GitHub Secrets')
}
function restart() { step.value = 'start'; needPassword.value = false; form.code = ''; form.twoFa = ''; error.value = '' }
</script>

<template>
  <div class="wrap admin">
    <header class="head">
      <span class="eyebrow">Admin · one-time setup</span>
      <h1>Telegram login</h1>
      <p class="muted">Creates the <code>TELEGRAM_SESSION</code> that lets GitHub ask <strong>@WebpageBot</strong> to refresh link previews after you publish. Nothing is saved on this server.</p>
    </header>

    <SqSheet border rounded="xl" class="panel">
      <ol class="steps">
        <li :class="{ on: step === 'start', done: step !== 'start' }">Details</li>
        <li :class="{ on: step === 'code', done: step === 'done' }">Code</li>
        <li :class="{ on: step === 'done' }">Session</li>
      </ol>

      <SqAlert v-if="error" type="error" :text="error" />

      <!-- step 1 -->
      <form v-if="step === 'start'" class="fields" @submit.prevent="sendCode">
        <SqTextField v-model="form.password" type="password" label="Admin password" hint="NUXT_ADMIN_PASSWORD from Vercel" persistent-hint autocomplete="current-password" required />
        <SqDivider />
        <SqTextField v-model="form.apiId" label="API ID" inputmode="numeric" hint="From my.telegram.org/apps" persistent-hint required />
        <SqTextField v-model="form.apiHash" label="API hash" autocomplete="off" required />
        <SqTextField v-model="form.phone" type="tel" label="Phone number" hint="International format, e.g. +85512345678" persistent-hint autocomplete="tel" required />
        <SqBtn type="submit" block :loading="loading" :prepend-icon="icons.telegram">Send login code</SqBtn>
      </form>

      <!-- step 2 -->
      <form v-else-if="step === 'code'" class="fields" @submit.prevent="signIn">
        <SqAlert type="info" variant="tonal" :text="via === 'app' ? 'Telegram sent a code to your Telegram app (a chat from “Telegram”).' : 'Telegram sent the code by SMS.'" />
        <SqTextField v-model="form.code" label="Login code" inputmode="numeric" autocomplete="one-time-code" required />
        <SqTextField v-if="needPassword" v-model="form.twoFa" type="password" label="Two-step verification password" hint="This account has a cloud password" persistent-hint autocomplete="current-password" required />
        <SqBtn type="submit" block :loading="loading">{{ needPassword ? 'Sign in' : 'Continue' }}</SqBtn>
        <SqBtn variant="text" block @click="restart">Start again</SqBtn>
      </form>

      <!-- step 3 -->
      <div v-else class="fields">
        <SqAlert type="success" title="Logged in" :text="result.account ? `Session created for ${result.account}.` : 'Session created.'" />
        <label class="label">TELEGRAM_SESSION</label>
        <textarea class="session" readonly :value="result.session" rows="5" @focus="($event.target as HTMLTextAreaElement).select()" />
        <SqBtn block prepend-icon="copy" @click="copy">Copy session</SqBtn>
        <ol class="next muted">
          <li>Open <strong>github.com/KheangLov/syndica-web → Settings → Secrets and variables → Actions</strong>.</li>
          <li><strong>New repository secret</strong> → Name <code>TELEGRAM_SESSION</code> → paste.</li>
          <li>Also add <code>TELEGRAM_API_ID</code> and <code>TELEGRAM_API_HASH</code> with the values you entered above.</li>
        </ol>
        <SqAlert type="warning" variant="tonal" title="Keep it secret" text="This string can fully access the Telegram account. Paste it only into GitHub Secrets, then close this page. To revoke it: Telegram → Settings → Devices." />
      </div>
    </SqSheet>
  </div>
</template>

<style scoped>
.admin { max-width: 560px; }
.head { padding: 32px 0 20px; }
.head h1 { font-size: 2rem; letter-spacing: -0.03em; margin: 10px 0 8px; }
.head p { margin: 0; line-height: 1.6; }
.head code, .next code { font-size: 0.85em; padding: 1px 5px; border-radius: 6px; background: var(--sq-surface-variant); }
.panel { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.steps { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; counter-reset: s; }
.steps li { flex: 1; counter-increment: s; font-size: 0.8rem; font-weight: 600; color: var(--sq-on-surface-variant); padding-top: 8px; border-top: 3px solid var(--sq-border); }
.steps li::before { content: counter(s) '. '; }
.steps li.on { color: var(--sq-primary); border-color: var(--sq-primary); }
.steps li.done { border-color: color-mix(in srgb, var(--sq-primary) 45%, var(--sq-border)); }
.fields { display: flex; flex-direction: column; gap: 16px; }
.label { font-size: 0.8rem; font-weight: 600; color: var(--sq-on-surface-variant); margin-bottom: -10px; }
.session { width: 100%; box-sizing: border-box; font: 0.75rem/1.5 var(--sq-font-mono, ui-monospace, monospace); padding: 12px; border-radius: var(--sq-radius-md); border: 1px solid var(--sq-border); background: var(--sq-surface-variant); color: var(--sq-on-surface); resize: none; word-break: break-all; }
.next { margin: 0; padding-left: 1.2em; font-size: 0.9rem; line-height: 1.6; display: flex; flex-direction: column; gap: 4px; }
</style>
