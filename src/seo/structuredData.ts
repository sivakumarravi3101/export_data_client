import { absoluteUrl, SITE_NAME } from '@/seo/config'
import type { HistorySeries } from '@/lib/historyChart'

type Json = Record<string, unknown>
const CTX = 'https://schema.org'

export const breadcrumbLd = (items: { name: string; path: string }[]): Json => ({
  '@context': CTX,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
})

export const websiteLd = (): Json => ({
  '@context': CTX, '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/'), inLanguage: 'en',
})

export function countryPageLd(o: { countryName: string; path: string; description: string; products: { name: string; path: string }[] }): Json[] {
  return [
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: o.countryName, path: o.path }]),
    {
      '@context': CTX, '@type': 'CollectionPage', name: `Indian exports to ${o.countryName}`, url: absoluteUrl(o.path), description: o.description,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
      ...(o.products.length && {
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: o.products.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: absoluteUrl(p.path) })),
        },
      }),
    },
  ]
}

/** Indian financial years run April-March: "2020-21" .. "2025-26" => 2020-04-01/2026-03-31. */
export function temporalCoverage(series: HistorySeries): string | undefined {
  const starts = series.slots.map(s => /^(\d{4})-\d{2}$/.exec(s.year)?.[1]).filter((y): y is string => !!y).map(Number)
  if (!starts.length || starts.length !== series.slots.length) return undefined
  return `${Math.min(...starts)}-04-01/${Math.max(...starts) + 1}-03-31`
}

export function productPageLd(o: {
  countryName: string; countryPath: string; path: string; productName: string; hsCode: string
  description: string; source: string; history: HistorySeries
}): Json[] {
  const coverage = temporalCoverage(o.history)
  return [
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: o.countryName, path: o.countryPath }, { name: o.productName, path: o.path }]),
    {
      '@context': CTX, '@type': 'Dataset',
      name: `${o.productName} exports from India to ${o.countryName} (HS ${o.hsCode})`,
      description: o.description, url: absoluteUrl(o.path),
      keywords: [o.productName, `HS ${o.hsCode}`, `India exports to ${o.countryName}`],
      spatialCoverage: { '@type': 'Place', name: o.countryName },
      ...(coverage && { temporalCoverage: coverage }),
      variableMeasured: [{ '@type': 'PropertyValue', name: 'Export value', unitText: 'Million USD' }],
      ...(o.source && { citation: o.source }),
      creator: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      inLanguage: 'en',
    },
  ]
}
