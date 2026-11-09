<script setup lang="ts">
import { PAGE_SIZES } from '@/composables/useCountryProducts'

defineProps<{ page: number; pageSize: number; hasNext: boolean; loading: boolean }>()
const emit = defineEmits<{ 'update:page': [page: number]; 'update:pageSize': [size: number] }>()
</script>

<template>
  <nav class="pager" aria-label="Product pages">
    <div class="nav">
      <button type="button" class="lg-btn" :disabled="page <= 1 || loading" @click="emit('update:page', page - 1)">Previous</button>
      <span class="cur" aria-current="page">Page {{ page }}</span>
      <button type="button" class="lg-btn" :disabled="!hasNext || loading" @click="emit('update:page', page + 1)">Next</button>
    </div>
    <label class="size">
      <span>Records per page</span>
      <select class="lg-select" :value="pageSize" :disabled="loading" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
      </select>
    </label>
  </nav>
</template>

<style scoped>
.pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.nav { display: flex; align-items: center; gap: 12px; }
.cur { font-size: .9rem; color: var(--lg-muted); min-width: 56px; text-align: center; }
.size { display: flex; align-items: center; gap: 8px; font-size: .82rem; color: var(--lg-muted); }
</style>
