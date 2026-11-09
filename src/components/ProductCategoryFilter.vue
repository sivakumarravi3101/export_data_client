<script setup lang="ts">
import type { Category } from '@/models/category'

defineProps<{ categories: Category[]; modelValue: number | null; loading: boolean; error: string | null; disabled: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [id: number | null]; retry: [] }>()
const onChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v === '' ? null : Number(v))
}
</script>

<template>
  <div class="filter">
    <label for="cat" class="lbl">Category</label>
    <select id="cat" class="lg-select" :value="modelValue ?? ''" :disabled="disabled || loading" @change="onChange">
      <option value="">{{ loading ? 'Loading categories…' : 'All Categories' }}</option>
      <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <p v-if="error" class="err" role="alert">{{ error }} <button type="button" @click="emit('retry')">Try again</button></p>
  </div>
</template>

<style scoped>
.filter { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.lbl { font-size: .85rem; color: var(--lg-muted); }
.filter .lg-select { flex: 1 1 200px; }
.err { flex-basis: 100%; margin: 0; font-size: .8rem; color: var(--lg-red); }
.err button { background: none; border: 0; padding: 0; font: inherit; color: var(--lg-accent); text-decoration: underline; cursor: pointer; }
</style>
