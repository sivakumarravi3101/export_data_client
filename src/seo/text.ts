const SMALL = new Set(['and', 'or', 'of', 'in', 'to', 'for', 'the', 'a', 'an', 'on', 'with', 'than', 'less', 'not'])

/** API names are UPPERCASE ("TOMATO SEEDS"); make them readable for titles and descriptions. */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Trim to `max` chars at a word boundary (search snippets cut around 155-160). */
export function truncate(s: string, max = 158): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.-]+$/, '') + '…'
}

/** Cut at a word boundary and add an ellipsis (used for the product-name part of titles). */
export function shorten(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const i = cut.lastIndexOf(' ')
  return (i >= max * 0.5 ? cut.slice(0, i) : cut).replace(/[\s,;:.-]+$/, '') + '…'
}

/**
 * Product page title within ~62 characters. When it is too long the *product name* is shortened, never the
 * country or HS code, because those are what keep titles unique across the thousands of country x product pages.
 */
export function productPageTitle(name: string, country: string, hsCode: string, max = 62): string {
  const tiers = [` Exports from India to ${country} (HS ${hsCode})`, ` Exports to ${country} (HS ${hsCode})`]
  for (const suffix of tiers) if (name.length + suffix.length <= max) return name + suffix
  const budget = max - tiers[1]!.length
  return budget >= 12 ? shorten(name, budget) + tiers[1]! : `${shorten(name, 14)} Exports to ${country}`
}
