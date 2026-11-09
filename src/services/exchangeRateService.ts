import type { CurrencyCode } from '@/lib/currency'

export interface ExchangeRate {
  target: CurrencyCode
  /** 1 USD = rate * target */
  rate: number
  /** Date the rate applies to, as published by the source (ECB reference rates). */
  rateDate: string
  /** When this app retrieved it (epoch ms). */
  fetchedAt: number
}

interface FrankfurterResponse { base: string; date: string; rates: Record<string, number> }

/** Frankfurter: free ECB reference rates, no API key. Updated once per working day. */
export async function fetchUsdRate(target: CurrencyCode): Promise<ExchangeRate> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${target}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Exchange rate request failed (${res.status})`)
  const data = (await res.json()) as FrankfurterResponse
  const rate = data.rates?.[target]
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('Exchange rate unavailable')
  return { target, rate, rateDate: data.date, fetchedAt: Date.now() }
}
