<script setup lang="ts">
// Approximate mock of how each app draws a link card. Real apps differ slightly by version.
const props = defineProps<{
  app: 'telegram' | 'facebook' | 'messenger' | 'whatsapp' | 'linkedin' | 'x' | 'discord' | 'slack'
  siteName: string; domain: string; title: string; description?: string; image?: string
  layout: 'large' | 'compact'; loading?: boolean
}>()
const compact = computed(() => props.layout === 'compact')
</script>

<template>
  <div class="sp" :class="[`sp--${app}`, { 'sp--compact': compact }]">
    <!-- Telegram: message bubble, coloured bar, image under the text or thumbnail on the right -->
    <div v-if="app === 'telegram'" class="tg">
      <div class="tg__link">https://{{ domain }}/…</div>
      <div class="tg__card">
        <div class="tg__text">
          <div class="tg__site">{{ siteName }}</div>
          <div class="tg__title">{{ title }}</div>
          <div v-if="description" class="tg__desc">{{ description }}</div>
          <div v-if="image && !compact" class="img img--wide"><img :src="image" alt=""></div>
        </div>
        <div v-if="image && compact" class="img img--thumb tg__thumb"><img :src="image" alt=""></div>
      </div>
    </div>

    <!-- Facebook: composer card -->
    <div v-else-if="app === 'facebook'" class="fb" :class="{ 'fb--row': compact }">
      <div v-if="image" class="img" :class="compact ? 'img--sq fb__thumb' : 'img--wide'"><img :src="image" alt=""></div>
      <div class="fb__text">
        <div class="fb__domain">{{ domain.toUpperCase() }}</div>
        <div class="fb__title">{{ title }}</div>
        <div v-if="description && !compact" class="fb__desc">{{ description }}</div>
      </div>
    </div>

    <!-- Messenger: always full width -->
    <div v-else-if="app === 'messenger'" class="ms">
      <div v-if="image" class="img" :class="compact ? 'img--sq' : 'img--wide'"><img :src="image" alt=""></div>
      <div class="ms__text"><div class="ms__title">{{ title }}</div><div class="ms__domain">{{ domain }}</div></div>
    </div>

    <!-- WhatsApp: bubble with a preview box -->
    <div v-else-if="app === 'whatsapp'" class="wa">
      <div class="wa__card" :class="{ 'wa__card--row': compact }">
        <div v-if="image" class="img" :class="compact ? 'img--sq wa__thumb' : 'img--wide'"><img :src="image" alt=""></div>
        <div class="wa__text">
          <div class="wa__title">{{ title }}</div>
          <div v-if="description" class="wa__desc">{{ description }}</div>
          <div class="wa__domain">{{ domain }}</div>
        </div>
      </div>
      <div class="wa__link">https://{{ domain }}/…</div>
    </div>

    <!-- LinkedIn -->
    <div v-else-if="app === 'linkedin'" class="li" :class="{ 'li--row': compact }">
      <div v-if="image" class="img" :class="compact ? 'img--sq li__thumb' : 'img--wide'"><img :src="image" alt=""></div>
      <div class="li__text"><div class="li__title">{{ title }}</div><div class="li__domain">{{ domain }}</div></div>
    </div>

    <!-- X -->
    <div v-else-if="app === 'x'" class="x">
      <template v-if="!compact">
        <div v-if="image" class="img img--wide x__img"><img :src="image" alt=""><span class="x__badge">{{ domain }}</span></div>
        <div class="x__from">From {{ domain }}</div>
      </template>
      <div v-else class="x__row">
        <div v-if="image" class="img img--sq x__thumb"><img :src="image" alt=""></div>
        <div class="x__text"><div class="x__domain">{{ domain }}</div><div class="x__title">{{ title }}</div><div v-if="description" class="x__desc">{{ description }}</div></div>
      </div>
    </div>

    <!-- Discord: embed -->
    <div v-else-if="app === 'discord'" class="dc">
      <div class="dc__body">
        <div class="dc__text">
          <div class="dc__site">{{ siteName }}</div>
          <div class="dc__title">{{ title }}</div>
          <div v-if="description" class="dc__desc">{{ description }}</div>
        </div>
        <div v-if="image && compact" class="img img--thumb dc__thumb"><img :src="image" alt=""></div>
      </div>
      <div v-if="image && !compact" class="img img--wide dc__img"><img :src="image" alt=""></div>
    </div>

    <!-- Slack: unfurl -->
    <div v-else class="sl">
      <div class="sl__body">
        <div class="sl__text">
          <div class="sl__site">{{ siteName }}</div>
          <div class="sl__title">{{ title }}</div>
          <div v-if="description" class="sl__desc">{{ description }}</div>
        </div>
        <div v-if="image && compact" class="img img--thumb"><img :src="image" alt=""></div>
      </div>
      <div v-if="image && !compact" class="img img--wide sl__img"><img :src="image" alt=""></div>
    </div>
    <div v-if="loading" class="sp__loading">Drawing…</div>
  </div>
</template>

<style scoped>
.sp { position: relative; font-family: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif; font-size: 14px; line-height: 1.35; }
.sp__loading { position: absolute; top: 8px; right: 8px; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,.55); color: #fff; }
.img { overflow: hidden; background: #ddd; flex: none; }
.img img { display: block; width: 100%; height: 100%; object-fit: cover; }
.img--wide { aspect-ratio: 1.91; width: 100%; }
.img--sq { aspect-ratio: 1; }
.img--thumb { width: 72px; height: 72px; border-radius: 6px; }
.clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.tg { background: #effdde; border-radius: 14px 14px 4px 14px; padding: 8px 10px; max-width: 360px; margin-left: auto; color: #000; }
.tg__link { color: #168acd; margin-bottom: 6px; word-break: break-all; }
.tg__card { display: flex; gap: 8px; border-left: 3px solid #4fae4e; padding-left: 8px; }
.tg__text { flex: 1; min-width: 0; }
.tg__site { color: #4fae4e; font-weight: 600; font-size: 13px; }
.tg__title { font-weight: 600; }
.tg__desc { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.tg .img--wide { margin-top: 6px; border-radius: 6px; }
.tg__thumb { width: 60px; height: 60px; }

.fb { background: #242526; color: #e4e6eb; border-radius: 4px; overflow: hidden; max-width: 420px; }
.fb--row { display: flex; }
.fb__thumb { width: 132px; }
.fb__text { padding: 10px 12px; background: #3a3b3c; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
.fb__domain { font-size: 12px; color: #b0b3b8; }
.fb__title { font-weight: 600; font-size: 15px; }
.fb__desc { font-size: 13px; color: #b0b3b8; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

.ms { background: #303030; color: #fff; border-radius: 18px; overflow: hidden; max-width: 300px; margin-left: auto; }
.ms__text { padding: 10px 14px; }
.ms__title { font-weight: 600; }
.ms__domain { color: #b0b3b8; font-size: 13px; }

.wa { background: #d9fdd3; border-radius: 10px 10px 2px 10px; padding: 4px 4px 6px; max-width: 360px; margin-left: auto; color: #111b21; }
.wa__card { background: #c8eec2; border-radius: 8px; overflow: hidden; }
.wa__card--row { display: flex; }
.wa__thumb { width: 84px; }
.wa__text { padding: 8px 10px; min-width: 0; }
.wa__title { font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wa__desc { font-size: 13px; color: #54656f; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wa__domain { font-size: 12px; color: #667781; margin-top: 2px; }
.wa__link { color: #027eb5; padding: 6px 6px 0; word-break: break-all; }

.li { background: #fff; color: #191919; border: 1px solid #e0dfdc; border-radius: 8px; overflow: hidden; max-width: 420px; }
.li--row { display: flex; align-items: center; }
.li__thumb { width: 72px; margin: 8px; border-radius: 4px; }
.li__text { padding: 10px 12px; background: #eef3f8; flex: 1; }
.li--row .li__text { background: none; }
.li__title { font-weight: 600; }
.li__domain { font-size: 12px; color: #666; }

.x { color: #0f1419; max-width: 420px; }
.x__img { border-radius: 16px; position: relative; border: 1px solid #cfd9de; }
.x__badge { position: absolute; left: 10px; bottom: 10px; background: rgba(0,0,0,.77); color: #fff; font-size: 12px; padding: 1px 6px; border-radius: 4px; }
.x__from { font-size: 13px; color: #536471; margin-top: 4px; }
.x__row { display: flex; border: 1px solid #cfd9de; border-radius: 16px; overflow: hidden; }
.x__thumb { width: 130px; border-right: 1px solid #cfd9de; }
.x__text { padding: 10px 12px; display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 0; }
.x__domain, .x__desc { color: #536471; font-size: 14px; }
.x__desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.dc { background: #2b2d31; color: #dbdee1; border-left: 4px solid #5865f2; border-radius: 4px; padding: 10px 14px 14px 12px; max-width: 440px; }
.dc__body { display: flex; gap: 12px; }
.dc__text { flex: 1; min-width: 0; }
.dc__site { font-size: 12px; color: #b5bac1; }
.dc__title { color: #00a8fc; font-weight: 600; margin: 4px 0; }
.dc__desc { font-size: 13px; }
.dc__thumb { width: 80px; height: 80px; border-radius: 4px; }
.dc__img { margin-top: 10px; border-radius: 4px; }

.sl { border-left: 4px solid #ddd; padding: 2px 0 2px 12px; color: #1d1c1d; max-width: 440px; }
.sl__body { display: flex; gap: 12px; }
.sl__text { flex: 1; min-width: 0; }
.sl__site { font-weight: 700; font-size: 13px; }
.sl__title { color: #1264a3; font-weight: 700; }
.sl__desc { font-size: 14px; }
.sl__img { margin-top: 8px; border-radius: 8px; max-width: 360px; }
</style>
