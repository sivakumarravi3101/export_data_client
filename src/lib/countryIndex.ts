import type { Country } from '@/models/country'
import { slugify } from '@/lib/slug'

export interface CountryIndex {
  bySlug: Map<string, Country>
  slugById: Map<number, string>
}

/** Stable slug per country. Collisions (same slug, different id) get `-<id>`, resolved in id order so it is deterministic. */
export function buildCountryIndex(countries: readonly Country[]): CountryIndex {
  const bySlug = new Map<string, Country>()
  const slugById = new Map<number, string>()
  for (const c of [...countries].sort((a, b) => a.id - b.id)) {
    let slug = slugify(c.name, 80) || `country-${c.id}`
    if (bySlug.has(slug)) slug = `${slug}-${c.id}`
    bySlug.set(slug, c)
    slugById.set(c.id, slug)
  }
  return { bySlug, slugById }
}

let memo: { list: readonly Country[]; index: CountryIndex } | null = null
export function countryIndexFor(list: readonly Country[]): CountryIndex {
  if (memo?.list !== list) memo = { list, index: buildCountryIndex(list) }
  return memo.index
}
