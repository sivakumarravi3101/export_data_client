/** URL-safe, lowercase, hyphenated slug. Cuts at a word boundary when longer than `max`. */
export function slugify(input: string, max = 60): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= max) return base
  const cut = base.slice(0, max)
  const i = cut.lastIndexOf('-')
  return (i > 20 ? cut.slice(0, i) : cut).replace(/-+$/, '')
}

/**
 * Product URL key: `<hsCode>-<name-slug>`, e.g. `12099160-tomato-seeds`.
 * The HS code is the stable, unique identifier (and what the API is keyed on); the slug is only for humans
 * and search snippets, so renaming a product never breaks the URL.
 */
export function buildProductKey(hsCode: string, productName: string): string {
  const s = slugify(productName)
  return s ? `${hsCode}-${s}` : hsCode
}

export function parseProductKey(key: string): { hsCode: string; slug: string } | null {
  const m = /^(\d{4,12})(?:-(.+))?$/.exec(key)
  return m ? { hsCode: m[1]!, slug: m[2] ?? '' } : null
}

export const countryPath = (countrySlug: string) => `/country/${countrySlug}`
export const productPath = (countrySlug: string, hsCode: string, productName: string) =>
  `/country/${countrySlug}/product/${buildProductKey(hsCode, productName)}`
