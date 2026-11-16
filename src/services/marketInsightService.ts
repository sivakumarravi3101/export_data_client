import client from "@/http/client"
import { type Country } from "@/models/country"
import { type Category } from '@/models/category'
import { type CountryProductsResponse } from "@/models/countryProduct"

let countriesCache: Country[] | null = null
let countriesRequest: Promise<Country[]> | null = null
/** Synchronous read of the already-loaded list (used for prerendering/hydration). */
export const peekCountries = () => countriesCache
export function primeCountries(list: Country[]) { countriesCache = list; countriesRequest = Promise.resolve(list) }
/** One shared request; the list rarely changes, so it is reused across the app. */
export function getCountries(): Promise<Country[]> {
  countriesRequest ??= client.get('/countries').then(r => (countriesCache = r.data as Country[]))
  countriesRequest.catch(() => { countriesRequest = null })
  return countriesRequest
}

let categoriesCache: Category[] | null = null
let categoriesRequest: Promise<Category[]> | null = null
export const peekCategories = () => categoriesCache
export function primeCategories(list: Category[]) { categoriesCache = list; categoriesRequest = Promise.resolve(list) }
/** Categories rarely change, so share one request across the app; retry after a failure. */
export function getCategories(): Promise<Category[]> {
  categoriesRequest ??= client.get('/categories').then(r => (categoriesCache = r.data as Category[]))
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
  prerenderToken?: string,
): Promise<CountryProductsResponse> {
  const clauses = [`countryId eq ${countryId}`]
  if (categoryId !== null) clauses.push(`categoryId eq ${categoryId}`)
  const filter = encodeURIComponent(clauses.join(' and '))
  const response = await client.get(`/products?$filter=${filter}&$top=${top}&$skip=${skip}`,
    {
      headers: prerenderToken
        ? { 'X-Prerender-Token': prerenderToken }
        : {},
    },
  )
  return response.data as CountryProductsResponse
}
