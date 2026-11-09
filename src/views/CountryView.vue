<script setup lang="ts">
import "@/assets/glass.css";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import CountryHero from "@/components/CountryHero.vue";
import CountryMarketOverview from "@/components/CountryMarketOverview.vue";
import CurrencySelector from "@/components/CurrencySelector.vue";
import MarketHistorySection from "@/components/MarketHistorySection.vue";
import ProductCategoryFilter from "@/components/ProductCategoryFilter.vue";
import ProductList from "@/components/ProductList.vue";
import ProductPagination from "@/components/ProductPagination.vue";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { useCountryImage } from "@/composables/useCountryImage";
import { useCountryProducts } from "@/composables/useCountryProducts";
import { useCurrency } from "@/composables/useCurrency";
import { useProductDemand } from "@/composables/useProductDemand";

const route = useRoute();
const router = useRouter();
const countryId = computed(() => Number(route.params.countryId));
const selectedHs = computed(() => (route.query.hs as string) || null);

const list = useCountryProducts(countryId);
const countryName = computed(
  () =>
    (route.query.name as string) ||
    list.dataCountryName.value ||
    "Selected country"
);
const { image, loaded } = useCountryImage(countryName);
const {
  overview,
  loading: demandLoading,
  error: demandError,
} = useProductDemand(selectedHs, countryId);
const fx = useCurrency();

const selectProduct = (hs: string) =>
  router.replace({ query: { ...route.query, hs } });
</script>

<template>
  <main class="country-page">
    <CountryHero :country-name="countryName" :image="image" :loaded="loaded" />

    <div class="content">
      <CountryMarketOverview
        class="market"
        :overview="overview"
        :country-name="countryName"
        :idle="!selectedHs"
        :loading="demandLoading"
        :error="demandError"
        :money="fx.money"
        :rate-note="fx.rateNote.value"
        :rate-error="fx.error.value"
      >
        <template #actions>
          <CurrencySelector
            :model-value="fx.requested.value"
            :options="CURRENCIES"
            :loading="fx.loading.value"
            @update:model-value="(cu) => fx.setCurrency(cu)"
          />
        </template>
      </CountryMarketOverview>

      <section class="lg-panel products" aria-label="Products">
        <h2>Export products</h2>
        <ProductCategoryFilter
          :categories="list.categories.value"
          :model-value="list.categoryId.value"
          :loading="list.categoriesLoading.value"
          :error="list.categoriesError.value"
          :disabled="list.loading.value"
          @update:model-value="list.setCategory"
          @retry="list.reloadCategories"
        />
        <ProductList
          :products="list.products.value"
          :loading="list.loading.value"
          :error="list.error.value"
          :selected-hs="selectedHs"
          :filtered="list.categoryId.value !== null"
          @select="selectProduct"
          @retry="list.reload"
        />
        <ProductPagination
          v-if="
            list.page.value > 1 ||
            list.hasNext.value ||
            list.pageSize.value !== 50
          "
          :page="list.page.value"
          :page-size="list.pageSize.value"
          :has-next="list.hasNext.value"
          :loading="list.loading.value"
          @update:page="list.setPage"
          @update:page-size="list.setPageSize"
        />
      </section>
      <!-- <MarketHistorySection
        v-if="selectedHs && !demandError"
        class="history"
        :overview="overview"
        :loading="demandLoading"
        :money="fx.money"
      /> -->
      <MarketHistorySection
        v-if="selectedHs && !demandError"
        class="history"
        :overview="overview"
        :loading="demandLoading"
        :convert="fx.convert"
        :currency="fx.currency.value"
      />
    </div>
  </main>
</template>

<style scoped>
.content {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  grid-template-areas: "market products" "history history";
  gap: 22px;
  align-items: start;
  max-width: 1400px;
  margin: 0 auto;
  padding: 22px clamp(20px, 5vw, 72px) 64px;
}
.market {
  grid-area: market;
  /* position: sticky; */
  top: 16px;
}
.history {
  grid-area: history;
}
.products {
  grid-area: products;
  display: grid;
  gap: 14px;
}
.products h2 {
  margin: 0;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}
@media (max-width: 900px) {
  .content {
    grid-template-columns: 1fr;
    grid-template-areas: "products" "market" "history";
  }
  .market {
    position: static;
  }
}
</style>
