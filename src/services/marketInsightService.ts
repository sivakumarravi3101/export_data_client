import client from "@/http/client"
import { type Country } from "@/models/country"
import { type Category } from '@/models/category'
import { type CountryProductsResponse } from "@/models/countryProduct"

export async function getCountries(): Promise<Country[]> {
  const response = await client.get("/countries")
  return response.data as Country[]
}
let categoriesRequest: Promise<Category[]> | null = null
/** Categories rarely change, so share one request across the app; retry after a failure. */
export function getCategories(): Promise<Category[]> {
  categoriesRequest ??= client.get('/categories').then(r => r.data as Category[])
  categoriesRequest.catch(() => { categoriesRequest = null })
  return categoriesRequest
}

export interface ProductQuery {
  categoryId?: number | null
  top?: number
  skip?: number
}
export async function getProductsByCountry(
  countryId: number,
  { categoryId = null, top = 50, skip = 0 }: ProductQuery = {},
): Promise<CountryProductsResponse> {
  // Same OData-style `$filter ... eq ... and ...` convention as the existing productId/countryId filter.
  const clauses = [`countryId eq ${countryId}`]
  if (categoryId !== null) clauses.push(`categoryId eq ${categoryId}`)
  const filter = encodeURIComponent(clauses.join(' and '))
  const response = await client.get(`/products?$filter=${filter}&$top=${top}&$skip=${skip}`)
  return response.data as CountryProductsResponse
}
