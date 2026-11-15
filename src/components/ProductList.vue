<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import type { ProductSummary } from '@/models/countryProduct'

// Cards are real links (<a href>) so crawlers and "open in new tab" work; clicking still navigates in-app.
defineProps<{ products: ProductSummary[]; loading: boolean; error: string | null; selectedHs: string | null; filtered: boolean; toProduct: (p: ProductSummary) => RouteLocationRaw }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="list" :aria-busy="loading">
    <div v-if="loading" class="skels" role="status" aria-label="Loading products">
      <div v-for="n in 6" :key="n" class="lg-card product-skeleton" aria-hidden="true">
        <span class="lg-skel skeleton-title" />
        <span class="skeleton-meta">
          <span class="lg-skel skeleton-code" />
          <span class="lg-skel skeleton-year" />
        </span>
        <span class="lg-skel skeleton-category" />
      </div>
    </div>
    <p v-else-if="error" class="note err" role="alert">{{ error }} <button type="button" @click="emit('retry')">Try again</button></p>
    <p v-else-if="!products.length" class="note">{{ filtered ? 'No products match this category for this country.' : 'No export products found for this country.' }}</p>
    <ul v-else>
      <li v-for="(p, i) in products" :key="p.hsCode" class="lg-rise" :style="{ '--i': Math.min(i, 12) }">
        <RouterLink :to="toProduct(p)" class="lg-card card" :class="{ on: p.hsCode === selectedHs }" :aria-current="p.hsCode === selectedHs ? 'page' : undefined">
          <strong :title="p.productName">{{ p.productName || 'Unnamed product' }}</strong>
          <span class="meta">
            <span v-if="p.hsCode">HS {{ p.hsCode }}</span>
            <span v-if="p.latestYear">Latest year {{ p.latestYear }}</span>
          </span>
          <span v-if="p.categoryName" class="lg-chip">{{ p.categoryName }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list { min-height: 120px; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; max-height: 62svh; overflow-y: auto; padding: 4px; margin: -4px; }
.card { width: 100%; display: grid; gap: 6px; justify-items: start; text-align: left; padding: 13px 15px; font: inherit; cursor: pointer; text-decoration: none; color: inherit; }
strong { font-size: .95rem; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: .8rem; color: var(--lg-muted); }
.skels { display: grid; gap: 10px; }
.product-skeleton { display: grid; gap: 8px; min-height: 76px; padding: 13px 15px; }
.skeleton-title { width: 62%; max-width: 320px; height: 13px; }
.skeleton-meta { display: flex; gap: 14px; }
.skeleton-code { width: 76px; height: 10px; }
.skeleton-year { width: 104px; height: 10px; }
.skeleton-category { width: 80px; height: 18px; border-radius: 999px; }
.note { margin: 0; padding: 18px 4px; color: var(--lg-muted); }
.err { color: var(--lg-red); }
.note button { background: none; border: 0; padding: 0; font: inherit; color: var(--lg-accent); text-decoration: underline; cursor: pointer; }
</style>
