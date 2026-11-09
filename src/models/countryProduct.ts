export interface CountryProduct {
  id: number
  productId: number
  countryId: number
  categoryId: number
  hsCode: string
  year: string
  productValue: number
  quantity: number
  countryName: string
  categoryName: string
  productName: string
  state: string
  port: string
  createdAt: string
}

export interface CountryProductsResponse {
  items: CountryProduct[]
}

/** One product (HS code) summarised from the per-year/state/port rows the API returns. */
export interface ProductSummary {
  hsCode: string
  productName: string
  categoryId: number
  categoryName: string
  latestYear: string
  records: number
}