import { computed, ref, watch, type Ref } from 'vue'
import { getCategories, getProductsByCountry } from '@/services/marketInsightService'
import { summarizeProducts } from '@/lib/productSummary'
import type { Category } from '@/models/category'
import type { CountryProduct } from '@/models/countryProduct'

export const PAGE_SIZES = [25, 50, 100] as const

export function useCountryProducts(countryId: Ref<number>) {
  const categories = ref<Category[]>([])
  const categoriesLoading = ref(true)
  const categoriesError = ref<string | null>(null)

  const categoryId = ref<number | null>(null)
  const page = ref(1)
  const pageSize = ref<number>(50)
  const rows = ref<CountryProduct[]>([])
  const hasNext = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let seq = 0 // ignore responses from superseded requests

  const products = computed(() => summarizeProducts(rows.value))
  const dataCountryName = computed(() => rows.value[0]?.countryName ?? null)

  async function load() {
    const mine = ++seq
    loading.value = true; error.value = null
    try {
      // Ask for one extra row: if it comes back there is a next page (the API returns no total count).
      const res = await getProductsByCountry(countryId.value, {
        categoryId: categoryId.value,
        top: pageSize.value + 1,
        skip: (page.value - 1) * pageSize.value,
      })
      if (mine !== seq) return
      const items = res.items ?? []
      hasNext.value = items.length > pageSize.value
      rows.value = items.slice(0, pageSize.value)
    } catch {
      if (mine !== seq) return
      error.value = 'Could not load products. Check your connection and try again.'
      rows.value = []; hasNext.value = false
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  async function loadCategories() {
    categoriesLoading.value = true; categoriesError.value = null
    try { categories.value = await getCategories() }
    catch { categoriesError.value = 'Categories unavailable.' }
    finally { categoriesLoading.value = false }
  }

  function setCategory(id: number | null) { if (id === categoryId.value) return; categoryId.value = id; page.value = 1; return load() }
  function setPage(p: number) { if (p < 1 || p === page.value) return; page.value = p; return load() }
  function setPageSize(n: number) { pageSize.value = n; page.value = 1; return load() }

  // Single trigger for the first load and for navigating between countries; resets filters.
  watch(countryId, () => { categoryId.value = null; page.value = 1; void load() }, { immediate: true })
  void loadCategories()

  return { categories, categoriesLoading, categoriesError, categoryId, page, pageSize, products, dataCountryName, hasNext, loading, error, setCategory, setPage, setPageSize, reload: load, reloadCategories: loadCategories }
}
