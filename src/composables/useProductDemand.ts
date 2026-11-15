import { computed, inject, ref, watch, type Ref } from 'vue'
import { getExportProductByHsncode } from '@/services/exportDemandService' // <- adjust to where your existing function lives
import { buildMarketOverview } from '@/lib/marketOverview'
import type { ProductDemand } from '@/models/exportDemandProduct'
import { PRELOAD_KEY } from '@/ssr/preload'

export function useProductDemand(hsCode: Ref<string | null>, countryId: Ref<number>) {
  const demand = ref<ProductDemand | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let seed = inject(PRELOAD_KEY, null)?.demand ?? null // prerendered pages already carry this response

  watch([hsCode, countryId], async ([hs, id]) => {
    if (seed && seed.hsCode === hs && seed.countryId === id) {
      demand.value = seed.data; error.value = null; loading.value = false; seed = null
      return
    }
    seed = null
    demand.value = null; error.value = null
    if (!hs) { loading.value = false; return }
    loading.value = true
    const current = () => hsCode.value === hs && countryId.value === id
    try {
      const result = await getExportProductByHsncode(hs, id)
      if (current()) demand.value = result // ignore stale responses
    } catch {
      if (current()) error.value = 'Could not load market details for this product.'
    } finally {
      if (current()) loading.value = false
    }
  }, { immediate: true })

  const overview = computed(() => (demand.value ? buildMarketOverview(demand.value) : null))
  return { demand, overview, loading, error }
}
