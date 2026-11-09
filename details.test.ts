import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

const get = vi.fn()
vi.mock('@/http/client', () => ({ default: { get: (u: string) => get(u) } }))

const row = (i: number, hs = `HS${i}`, year = '2024-25') => ({ id: i, productId: i, countryId: 2, categoryId: 1, hsCode: hs, year, productValue: 0, quantity: 0, countryName: 'Canada', categoryName: 'Cat', productName: `P${i}`, state: 's', port: 'p', createdAt: '' })
const decoded = (u: string) => decodeURIComponent(u)
const tick = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => { get.mockReset(); get.mockImplementation(async (u: string) => u.startsWith('/categories') ? { data: [{ id: 1, name: 'A' }] } : { data: { items: [] } }) })

describe('products query', () => {
  it('loads once with only the country filter, asks for pageSize+1, then paginates', async () => {
    const { useCountryProducts } = await import('@/composables/useCountryProducts')
    get.mockImplementation(async (u: string) => u.startsWith('/categories') ? { data: [] } : { data: { items: Array.from({ length: 51 }, (_, i) => row(i)) } })
    const p = useCountryProducts(ref(3)); await tick()
    const calls = get.mock.calls.map(c => c[0] as string).filter(u => u.startsWith('/products'))
    expect(calls).toHaveLength(1)
    expect(decoded(calls[0]!)).toBe('/products?$filter=countryId eq 3&$top=51&$skip=0')
    expect(p.hasNext.value).toBe(true); expect(p.products.value).toHaveLength(50)
    await p.setPage(2)
    expect(decoded(get.mock.calls.at(-1)![0])).toContain('$skip=50')
  })
  it('category adds categoryId, resets to page 1, and All Categories removes it', async () => {
    const { useCountryProducts } = await import('@/composables/useCountryProducts')
    const p = useCountryProducts(ref(3)); await tick()
    await p.setPage(2)
    await p.setCategory(7)
    const u = decoded(get.mock.calls.at(-1)![0])
    expect(u).toContain('countryId eq 3 and categoryId eq 7'); expect(u).toContain('$skip=0'); expect(p.page.value).toBe(1)
    await p.setCategory(null)
    expect(decoded(get.mock.calls.at(-1)![0])).not.toContain('categoryId')
  })
  it('keeps the filter when paging and ignores stale responses', async () => {
    const { useCountryProducts } = await import('@/composables/useCountryProducts')
    const p = useCountryProducts(ref(3)); await tick()
    let slow!: (v: unknown) => void
    get.mockImplementationOnce(() => new Promise(r => { slow = r }))
    const first = p.setCategory(1)
    get.mockImplementationOnce(async () => ({ data: { items: [row(99, 'NEW')] } }))
    await p.setCategory(2)
    slow({ data: { items: [row(1, 'OLD')] } }); await first
    expect(p.products.value.map(x => x.hsCode)).toEqual(['NEW'])
  })
  it('dedupes rows per HS code and picks latest year', async () => {
    const { summarizeProducts } = await import('@/lib/productSummary')
    const s = summarizeProducts([row(1, 'A', '2023-24'), row(2, 'A', '2025-26'), row(3, 'B')])
    expect(s).toHaveLength(2); expect(s[0]).toMatchObject({ hsCode: 'A', latestYear: '2025-26', records: 2 })
  })
  it('surfaces API errors', async () => {
    const { useCountryProducts } = await import('@/composables/useCountryProducts')
    const p = useCountryProducts(ref(3)); await tick()
    get.mockRejectedValueOnce(new Error('x')); await p.setCategory(5)
    expect(p.error.value).toBeTruthy(); expect(p.loading.value).toBe(false)
  })
})

describe('currency', () => {
  it('formats USD and INR correctly', async () => {
    const { formatMoney } = await import('@/lib/currency')
    expect(formatMoney(1250, 'USD')).toBe('$1,250.00')
    expect(formatMoney(104321.5, 'INR')).toBe('₹1,04,321.50')
  })
  it('converts with the fetched rate, caches it, never mutates USD, and falls back on failure', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => ({ base: 'USD', date: '2026-10-30', rates: { INR: 90 } }), url }))
    vi.stubGlobal('fetch', fetchMock)
    const { useCurrency } = await import('@/composables/useCurrency')
    const fx = useCurrency()
    expect(fx.money(100)).toBe('$100.00')
    await fx.setCurrency('INR')
    expect(fx.money(100)).toBe('₹9,000.00'); expect(fx.rateNote.value).toContain('2026-10-30')
    await fx.setCurrency('USD'); expect(fx.money(100)).toBe('$100.00')
    await fx.setCurrency('INR'); expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR')
  })
  it('keeps USD and reports an error when the rate cannot be fetched', async () => {
    vi.resetModules(); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const { useCurrency } = await import('@/composables/useCurrency')
    const fx = useCurrency(); await fx.setCurrency('INR')
    expect(fx.currency.value).toBe('USD'); expect(fx.requested.value).toBe('USD'); expect(fx.error.value).toMatch(/USD/)
  })
})

describe('market overview', () => {
  it('treats pricePerMT 0 as unavailable and leaves non-monetary values untouched', async () => {
    const { buildMarketOverview } = await import('@/lib/marketOverview')
    const demand = { productName: 'X', hsCode: '1', globalHistory: [], metadata: { source: 's', disclaimer: 'd' }, insights: [] } as never
    const o = buildMarketOverview(demand, { countryName: 'Canada', trendSignal: 'DECLINING', growthRate: '-22.43%', currentPriceMT: 538461.54, avgPrice5Yr: 500000, priceTrend: 'PRICE_STABLE', marketShare: 1.11, pricePerMT: 0, peakYear: '2023-24', riskLevel: 'High' })
    expect(o.market!.price.reportedPerMT).toBeNull(); expect(o.market!.marketSharePct).toBe(1.11); expect(o.market!.trend.growthRate).toBe('-22.43%')
  })
})
