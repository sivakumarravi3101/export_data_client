<script setup lang="ts">
import type { CurrencyCode, CurrencyOption } from '@/lib/currency'

defineProps<{ modelValue: CurrencyCode; options: CurrencyOption[]; loading: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [code: CurrencyCode] }>()
</script>

<template>
  <label class="cur">
    <span class="sr">Currency</span>
    <select class="lg-select" :value="modelValue" :disabled="loading" aria-label="Currency"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as CurrencyCode)">
      <option v-for="o in options" :key="o.code" :value="o.code">{{ o.code }} – {{ o.label }}</option>
    </select>
    <span v-if="loading" class="busy" role="status">Updating…</span>
  </label>
</template>

<style scoped>
.cur { display: inline-flex; align-items: center; gap: 8px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.busy { font-size: .78rem; color: var(--lg-muted); }
</style>
