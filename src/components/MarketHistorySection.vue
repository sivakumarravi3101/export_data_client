<script setup lang="ts">
import ProductHistoryBarChart from "@/components/ProductHistoryBarChart.vue";
import GlobalHistoryAreaChart from "@/components/GlobalHistoryAreaChart.vue";
import type { MarketOverview } from "@/lib/marketOverview";
import type { CurrencyCode } from "@/lib/currency";

defineProps<{
  overview: MarketOverview | null;
  loading: boolean;
  convert: (usd: number) => number;
  currency: CurrencyCode;
}>();
</script>

<template>
  <section class="history" aria-label="Market history">
    <template v-if="loading">
      <div class="lg-panel"><div class="lg-skel" /></div>
      <div class="lg-panel"><div class="lg-skel" /></div>
    </template>
    <template v-else-if="overview">
      <ProductHistoryBarChart
        :series="overview.productHistory"
        :product-name="overview.product.name"
        :convert="convert"
        :currency="currency"
      />
      <GlobalHistoryAreaChart
        :series="overview.globalHistory"
        :convert="convert"
        :currency="currency"
      />
    </template>
  </section>
</template>

<style scoped>
.history {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}
.lg-skel {
  height: 260px;
}
@media (max-width: 900px) {
  .history {
    grid-template-columns: 1fr;
  }
}
</style>
