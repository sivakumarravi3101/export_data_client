import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { buildHistorySeries, niceScale, monotonePath, formatTick } from '@/lib/historyChart'

const get = vi.fn()
vi.mock('@/http/client', () => ({ default: { get: (u: string) => get(u) } }))
const tick = () => new Promise(r => setTimeout(r, 0))

const productHistory = [
  { year: '2020-21', valueMillionUSD: 0.28 }, { year: '2021-22', valueMillionUSD: 0.28 },
  { year: '2023-24', valueMillionUSD: 0.27 }, { year: '2024-25', valueMillionUSD: 0.6 }, { year: '2025-26', valueMillionUSD: 0.23 },
]
const globalHistory = [{ year: '2020-21', valueMillionUSD: 7.29 }, { year: '2025-26', valueMillionUSD: 7.34 }]
const insight = (name: string) => ({ countryName: name, trendSignal: 'DECLINING', growthRate: '-4.80%', currentPriceMT: 589743.59, avgPrice5Yr: 192575.41, priceTrend: 'PREMIUM_RISING', marketShare: 4.41, pricePerMT: 0, peakYear: '2024-25', riskLevel: 'Medium' })
const demand = (insights: unknown[]) => ({ productName: 'TOMATO SEEDS', hsCode: '12099160', insights, globalHistory, productHistory, metadata: { source: 'APEDA', disclaimer: 'd' } })

describe('history series', () => {
  it('keeps backend years, sorts chronologically, exposes the missing year as a gap without inventing a value', () => {
    const s = buildHistorySeries([...productHistory].reverse())
    expect(s.slots.map(x => x.year)).toEqual(['2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'])
    expect(s.slots[2]).toEqual({ year: '2022-23', value: null })
    expect(s.latestYear).toBe('2025-26'); expect(s.max).toBe(0.6); expect(s.hasData).toBe(true)
  })
  it('treats zero as a real value and drops invalid entries (no NaN)', () => {
    const s = buildHistorySeries([{ year: '2024-25', valueMillionUSD: 0 }, { year: '2025-26', valueMillionUSD: NaN }, { year: '', valueMillionUSD: 1 }, { year: '2023-24', valueMillionUSD: undefined as never }])
    expect(s.slots).toEqual([{ year: '2024-25', value: 0 }]); expect(s.hasData).toBe(true); expect(s.max).toBe(0)
  })
  it('handles empty / missing arrays and non-FY labels', () => {
    for (const v of [[], null, undefined]) expect(buildHistorySeries(v)).toMatchObject({ slots: [], hasData: false, latestYear: null })
    expect(buildHistorySeries([{ year: 'B', valueMillionUSD: 2 }, { year: 'A', valueMillionUSD: 1 }]).slots.map(x => x.year)).toEqual(['A', 'B'])
  })
  it('niceScale / ticks are sane, including tiny and all-zero data', () => {
    expect(niceScale(9.37)).toMatchObject({ top: 10, step: 2.5 })
    expect(niceScale(0.6).top).toBeGreaterThanOrEqual(0.6); expect(niceScale(0)).toMatchObject({ ticks: [0, 1], top: 1 })
    expect(formatTick(2.5, 2.5)).toBe('2.5'); expect(formatTick(0.15, 0.05)).toBe('0.15'); expect(formatTick(10, 5)).toBe('10')
  })
  it('monotone line never leaves the data range', () => {
    const pts = [{ x: 0, y: 100 }, { x: 50, y: 40 }, { x: 100, y: 40 }, { x: 150, y: 90 }]
    const ys = [...monotonePath(pts).matchAll(/[\d.]+,([\d.-]+)/g)].map(m => Number(m[1]))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(40 - 1e-9); expect(Math.max(...ys)).toBeLessThanOrEqual(100 + 1e-9)
  })
})

describe('market overview data flow', () => {
  beforeEach(() => get.mockReset())
  it('requests hsCode + countryId, refetches on country change, makes one request per change', async () => {
    const { useProductDemand } = await import('@/composables/useProductDemand')
    get.mockImplementation(async () => ({ data: demand([insight('Japan')]) }))
    const hs = ref<string | null>('12099160'), id = ref(8)
    const d = useProductDemand(hs, id); await tick()
    expect(get).toHaveBeenCalledTimes(1); expect(get).toHaveBeenLastCalledWith('/export-demand/12099160?countryId=8')
    id.value = 3; await tick()
    expect(get).toHaveBeenCalledTimes(2); expect(get).toHaveBeenLastCalledWith('/export-demand/12099160?countryId=3')
    hs.value = null; await tick(); expect(get).toHaveBeenCalledTimes(2); expect(d.overview.value).toBeNull()
  })
  it('uses the returned insight directly (no name matching) and survives an empty insights array', async () => {
    const { useProductDemand } = await import('@/composables/useProductDemand')
    get.mockImplementationOnce(async () => ({ data: demand([insight('Nippon')]) })) // name differs from any UI country name
    const d = useProductDemand(ref('1'), ref(8)); await tick()
    expect(d.overview.value?.market?.countryName).toBe('Nippon')
    get.mockImplementationOnce(async () => ({ data: demand([]) }))
    const e = useProductDemand(ref('2'), ref(8)); await tick()
    expect(e.overview.value?.market).toBeNull(); expect(e.overview.value?.productHistory.hasData).toBe(true)
  })
  it('keeps productHistory and globalHistory separate', async () => {
    const { buildMarketOverview } = await import('@/lib/marketOverview')
    const o = buildMarketOverview(demand([insight('Japan')]) as never)
    expect(o.productHistory.slots.find(s => s.year === '2024-25')?.value).toBe(0.6)
    expect(o.globalHistory.slots.find(s => s.year === '2024-25')?.value).toBeNull() // product value 0.6 must not leak into global
    expect(o.globalHistory.slots.find(s => s.year === '2020-21')?.value).toBe(7.29)
  })
  it('tolerates an old backend response without productHistory', async () => {
    const { buildMarketOverview } = await import('@/lib/marketOverview')
    const d = { ...demand([insight('Japan')]) } as Record<string, unknown>; delete d.productHistory
    expect(buildMarketOverview(d as never).productHistory.hasData).toBe(false)
  })
  it('shows an error state when the request fails', async () => {
    const { useProductDemand } = await import('@/composables/useProductDemand')
    get.mockRejectedValueOnce(new Error('x'))
    const d = useProductDemand(ref('1'), ref(8)); await tick()
    expect(d.error.value).toBeTruthy(); expect(d.loading.value).toBe(false)
  })
})
