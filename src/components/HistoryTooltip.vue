<script setup lang="ts">
defineProps<{ tip: { year: string; text: string; latest: boolean; left: number; top: number } | null }>()
</script>

<template>
  <div v-if="tip" class="tip" :style="{ left: tip.left + 'px', top: tip.top + 'px' }" role="status">
    <b>{{ tip.year }}<small v-if="tip.latest"> · latest</small></b>
    <span>{{ tip.text }}</span>
  </div>
</template>

<style scoped>
.tip {
  position: absolute; z-index: 3; transform: translate(-50%, calc(-100% - 10px)); pointer-events: none; white-space: nowrap;
  display: grid; gap: 2px; padding: 8px 12px; border-radius: 12px; font-size: .8rem; color: var(--lg-ink);
  background: rgba(255, 255, 255, .94); border: 1px solid rgba(255, 255, 255, .9); box-shadow: 0 8px 22px rgba(18, 38, 75, .2);
}
.tip small { font-weight: 400; color: var(--lg-muted); }
.tip span { color: #0a4fb0; font-weight: 600; }
</style>
