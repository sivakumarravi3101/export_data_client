import type { InjectionKey } from 'vue'
import type { Country } from '@/models/country'
import type { Category } from '@/models/category'
import type { CountryProduct } from '@/models/countryProduct'
import type { ProductDemand } from '@/models/exportDemandProduct'
import { primeCategories, primeCountries } from '@/services/marketInsightService'

/** Data fetched at build time, embedded in the prerendered HTML so the browser hydrates without refetching. */
export interface Preload {
  countries?: Country[]
  categories?: Category[]
  countryProducts?: { countryId: number; rows: CountryProduct[] } // first page: pageSize + 1 rows
  demand?: { hsCode: string; countryId: number; data: ProductDemand }
}

export const PRELOAD_KEY: InjectionKey<Preload> = Symbol('preload')

declare global {
  interface Window { __PRELOAD__?: Preload }
}

export function applyPreloadCaches(p: Preload) {
  if (p.countries) primeCountries(p.countries)
  if (p.categories) primeCategories(p.categories)
}
