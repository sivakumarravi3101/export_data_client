// import type { ProductDemand } from '@/models/exportDemandProduct'
// import type { History } from '@/models/Historys';

// type Insight = ProductDemand['insights'][number]

// /** UI-ready view model. Monetary fields are USD as returned by the API (converted only at display time). */
// export interface MarketOverview {
//   product: { name: string; hsCode: string }
//   market: null | {
//     countryName: string
//     price: { currentPerMT: number; avg5YrPerMT: number; reportedPerMT: number | null }
//     trend: { signal: string; growthRate: string; priceTrend: string; peakYear: string }
//     marketSharePct: number
//     riskLevel: string
//   }
//   history: History[] // also the input a future trend chart needs
//   productHistory: History[] // also the input a future trend chart needs
//   source: string
//   disclaimer: string
// }

// export function buildMarketOverview(demand: ProductDemand, insight: Insight | null): MarketOverview {
//   return {
//     product: { name: demand.productName, hsCode: demand.hsCode },
//     market: insight && {
//       countryName: insight.countryName,
//       price: {
//         currentPerMT: insight.currentPriceMT,
//         avg5YrPerMT: insight.avgPrice5Yr,
//         reportedPerMT: insight.pricePerMT > 0 ? insight.pricePerMT : null, // API returns 0 when unavailable
//       },
//       trend: { signal: insight.trendSignal, growthRate: insight.growthRate, priceTrend: insight.priceTrend, peakYear: insight.peakYear },
//       marketSharePct: insight.marketShare,
//       riskLevel: insight.riskLevel,
//     },
//     history: demand.globalHistory,
//     productHistory: demand.productHistory,
//     source: demand.metadata.source,
//     disclaimer: demand.metadata.disclaimer,
//   }
// }

import type { ProductDemand } from '@/models/exportDemandProduct'
import { buildHistorySeries, type HistorySeries } from '@/lib/historyChart'

type Insight = ProductDemand['insights'][number]

/** UI-ready view model. Monetary fields are USD as returned by the API (converted only at display time). */
export interface MarketOverview {
  product: { name: string; hsCode: string }
  market: null | {
    countryName: string
    price: { currentPerMT: number; avg5YrPerMT: number; reportedPerMT: number | null }
    trend: { signal: string; growthRate: string; priceTrend: string; peakYear: string }
    marketSharePct: number
    riskLevel: string
  }
  productHistory: HistorySeries // export value of the selected product (productHistory)
  globalHistory: HistorySeries // overall global export value (globalHistory)
  source: string
  disclaimer: string
}

/**
 * The export-demand request is made with the country ID, so the backend returns that country's insight.
 * We use it directly; no matching on country names.
 */
export function pickCountryInsight(demand: ProductDemand): Insight | null {
  const list = demand.insights ?? []
  if (import.meta.env?.DEV && list.length > 1) console.warn(`[market overview] expected one country insight, received ${list.length}; using the first.`)
  return list[0] ?? null
}

export function buildMarketOverview(demand: ProductDemand): MarketOverview {
  const insight = pickCountryInsight(demand)
  return {
    product: { name: demand.productName, hsCode: demand.hsCode },
    market: insight && {
      countryName: insight.countryName,
      price: {
        currentPerMT: insight.currentPriceMT,
        avg5YrPerMT: insight.avgPrice5Yr,
        reportedPerMT: insight.pricePerMT > 0 ? insight.pricePerMT : null, // API returns 0 when unavailable
      },
      trend: { signal: insight.trendSignal, growthRate: insight.growthRate, priceTrend: insight.priceTrend, peakYear: insight.peakYear },
      marketSharePct: insight.marketShare,
      riskLevel: insight.riskLevel,
    },
    productHistory: buildHistorySeries(demand.productHistory),
    globalHistory: buildHistorySeries(demand.globalHistory),
    source: demand.metadata?.source ?? '',
    disclaimer: demand.metadata?.disclaimer ?? '',
  }
}

