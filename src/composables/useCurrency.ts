import { computed, reactive, ref } from 'vue'
import { BASE_CURRENCY, formatMoney, type CurrencyCode, type MoneyFormat } from '@/lib/currency'
import { fetchUsdRate, type ExchangeRate } from '@/services/exchangeRateService'

const TTL_MS = 6 * 60 * 60 * 1000 // ECB publishes once per working day
const storageKey = (c: CurrencyCode) => `fx:USD:${c}`

// Module-level state: one rate cache and one selection shared by the whole app.
const currency = ref<CurrencyCode>(BASE_CURRENCY)
const requested = ref<CurrencyCode>(BASE_CURRENCY)
const rates = reactive<Partial<Record<CurrencyCode, ExchangeRate>>>({})
const loading = ref(false)
const error = ref<string | null>(null)
const inflight = new Map<CurrencyCode, Promise<ExchangeRate>>()

const fresh = (r?: ExchangeRate | null): r is ExchangeRate => !!r && Date.now() - r.fetchedAt < TTL_MS

function readStored(c: CurrencyCode): ExchangeRate | null {
  try { const raw = localStorage.getItem(storageKey(c)); return raw ? (JSON.parse(raw) as ExchangeRate) : null } catch { return null }
}

function ensureRate(c: CurrencyCode): Promise<ExchangeRate> {
  const known = rates[c] ?? readStored(c)
  if (fresh(known)) { rates[c] = known; return Promise.resolve(known) }
  let p = inflight.get(c)
  if (!p) {
    p = fetchUsdRate(c).then(r => {
      rates[c] = r
      try { localStorage.setItem(storageKey(c), JSON.stringify(r)) } catch { /* ignore */ }
      return r
    }).finally(() => inflight.delete(c))
    inflight.set(c, p)
  }
  return p
}

async function setCurrency(code: CurrencyCode) {
  error.value = null
  requested.value = code
  if (code === BASE_CURRENCY) { currency.value = code; return }
  loading.value = true
  try {
    await ensureRate(code)
    if (requested.value === code) currency.value = code
  } catch {
    if (requested.value === code) {
      currency.value = BASE_CURRENCY
      requested.value = BASE_CURRENCY
      error.value = `Couldn't load the USD to ${code} exchange rate, so values are shown in USD.`
    }
  } finally {
    loading.value = false
  }
}

export function useCurrency() {
  const activeRate = computed(() => (currency.value === BASE_CURRENCY ? null : rates[currency.value] ?? null))
  /** USD amount -> number in the active currency. The source USD value is never mutated. */
  const convert = (usd: number) => (activeRate.value ? usd * activeRate.value.rate : usd)
  const money = (usd: number, fmt?: MoneyFormat) => formatMoney(convert(usd), currency.value, fmt)
  const rateNote = computed(() => {
    const r = activeRate.value
    if (!r) return null
    return `1 USD = ${formatMoney(r.rate, r.target, { minFraction: 2, maxFraction: 4 })} · ECB rate dated ${r.rateDate} · retrieved ${new Date(r.fetchedAt).toLocaleString()}`
  })
  return { currency, requested, loading, error, rateNote, money, convert, setCurrency }
}
