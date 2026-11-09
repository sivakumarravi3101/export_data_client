import type { CountryProduct, ProductSummary } from '@/models/countryProduct'

/** Group per-year/state/port rows into one summary per HS code. */
export function summarizeProducts(rows: CountryProduct[]): ProductSummary[] {
  const map = new Map<string, ProductSummary>()
  for (const r of rows) {
    const s = map.get(r.hsCode)
    if (!s) {
      map.set(r.hsCode, { hsCode: r.hsCode, productName: r.productName, categoryId: r.categoryId, categoryName: r.categoryName, latestYear: r.year, records: 1 })
    } else {
      s.records += 1
      if (r.year > s.latestYear) s.latestYear = r.year // "2025-26" sorts correctly as text
    }
  }
  return [...map.values()]
}
