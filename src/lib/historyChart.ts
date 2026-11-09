import type { History } from '@/models/Historys'

export interface HistorySlot { year: string; value: number | null } // null = year not reported by the API
export interface HistorySeries {
  slots: HistorySlot[]
  hasData: boolean
  max: number
  latestYear: string | null
}

const FY = /^(\d{4})-(\d{2})$/
const startYear = (y: string) => { const m = FY.exec(y); return m ? Number(m[1]) : null }
const fyLabel = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, '0')}`
const MAX_SPAN = 40

/**
 * Clean, sort chronologically and expose gaps. Years the API did not return become empty slots
 * (value null) so the time axis stays truthful; no value is ever filled in.
 */
export function buildHistorySeries(items: readonly History[] | null | undefined): HistorySeries {
  const byYear = new Map<string, number>()
  for (const i of items ?? []) {
    if (i && typeof i.year === 'string' && i.year.trim() && typeof i.valueMillionUSD === 'number' && Number.isFinite(i.valueMillionUSD)) {
      byYear.set(i.year.trim(), i.valueMillionUSD) // zero is a valid value
    }
  }
  const years = [...byYear.keys()]
  const starts = years.map(startYear)
  let slots: HistorySlot[]
  if (years.length && starts.every((s): s is number => s !== null) && Math.max(...starts) - Math.min(...starts) <= MAX_SPAN) {
    const lo = Math.min(...starts), hi = Math.max(...starts)
    const known = new Map(years.map((y, i) => [starts[i]!, y]))
    slots = []
    for (let s = lo; s <= hi; s++) {
      const y = known.get(s)
      slots.push(y !== undefined ? { year: y, value: byYear.get(y)! } : { year: fyLabel(s), value: null })
    }
  } else {
    slots = years.sort((a, b) => a.localeCompare(b)).map(y => ({ year: y, value: byYear.get(y)! }))
  }
  const filled = slots.filter(s => s.value !== null)
  return {
    slots,
    hasData: filled.length > 0,
    max: Math.max(0, ...filled.map(s => s.value as number)),
    latestYear: filled.length ? filled[filled.length - 1]!.year : null,
  }
}

export interface Scale { ticks: number[]; top: number; step: number }

/** "Nice" axis: ~4 intervals with steps of 1, 2, 2.5, 5 x 10^n; always starts at zero. */
export function niceScale(max: number, intervals = 4): Scale {
  if (!(max > 0)) return { ticks: [0, 1], top: 1, step: 1 }
  const raw = max / intervals
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const step = Number(((f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow).toPrecision(6))
  const n = Math.ceil(max / step - 1e-9)
  return { ticks: Array.from({ length: n + 1 }, (_, i) => Number((i * step).toPrecision(8))), top: n * step, step }
}

export function formatTick(v: number, step: number, locale = 'en-US'): string {
  const d = Number.isInteger(step) ? 0 : Math.min(3, (String(step).split('.')[1] ?? '').length)
  return v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d })
}

/** Plain number with 2 decimals, grouped for the given locale (no currency symbol). */
export const formatMillionNumber = (v: number, locale = 'en-US') =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

/** Smooth, monotone cubic path (Fritsch-Carlson): never overshoots the data, so values stay honest. */
export function monotonePath(pts: readonly { x: number; y: number }[]): string {
  const n = pts.length
  if (n === 0) return ''
  const p = (i: number) => pts[i]!
  if (n === 1) return `M${p(0).x},${p(0).y}`
  const dx: number[] = [], m: number[] = []
  for (let i = 0; i < n - 1; i++) { dx.push(p(i + 1).x - p(i).x); m.push((p(i + 1).y - p(i).y) / dx[i]!) }
  const t: number[] = new Array(n).fill(0)
  t[0] = m[0]!; t[n - 1] = m[n - 2]!
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, s = a * a + b * b
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]! }
  }
  let d = `M${p(0).x},${p(0).y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3
    d += ` C${p(i).x + h},${p(i).y + t[i]! * h} ${p(i + 1).x - h},${p(i + 1).y - t[i + 1]! * h} ${p(i + 1).x},${p(i + 1).y}`
  }
  return d
}
