export type CurrencyCode = 'USD' | 'INR'
export interface CurrencyOption { code: CurrencyCode; label: string; locale: string }

/** Add a currency here (and to CurrencyCode) and the selector + formatting pick it up. */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar', locale: 'en-US' },
  { code: 'INR', label: 'Indian Rupee', locale: 'en-IN' },
]
export const BASE_CURRENCY: CurrencyCode = 'USD' // currency the API reports in
export const currencyLocale = (code: CurrencyCode) => CURRENCIES.find(c => c.code === code)?.locale ?? 'en-US'
export interface MoneyFormat { minFraction?: number; maxFraction?: number }

export function formatMoney(amount: number, code: CurrencyCode, { minFraction = 2, maxFraction = 2 }: MoneyFormat = {}): string {
  const locale = CURRENCIES.find(c => c.code === code)?.locale ?? 'en-US'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction }).format(amount)
}
