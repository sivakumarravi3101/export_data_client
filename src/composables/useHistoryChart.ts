import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { BASE_CURRENCY, currencyLocale, formatMoney, type CurrencyCode } from '@/lib/currency'
import { formatMillionNumber, formatTick, niceScale, type HistorySeries } from '@/lib/historyChart'

export const CHART_H = 270
export const MARGIN = { t: 26, r: 14, b: 36, l: 50 }
const PLOT_H = CHART_H - MARGIN.t - MARGIN.b

export interface ChartCurrency {
  currency: () => CurrencyCode
  /** Numeric USD -> selected currency (useCurrency().convert). Expects a plain USD amount, not millions. */
  convert: (usd: number) => number
}

function useElementWidth(el: Ref<HTMLElement | null | undefined>, fallback = 560) {
  const width = ref(fallback)
  let ro: ResizeObserver | undefined
  onMounted(() => {
    if (!el.value) return
    width.value = Math.max(260, el.value.clientWidth || fallback)
    ro = new ResizeObserver(([e]) => { if (e) width.value = Math.max(260, Math.floor(e.contentRect.width)) })
    ro.observe(el.value)
  })
  onBeforeUnmount(() => ro?.disconnect())
  return width
}

/** Layout, scale and tooltip state shared by both charts. Pure geometry, no drawing. */
export function useHistoryChart(series: Ref<HistorySeries>, box: Ref<HTMLElement | null | undefined>, fx: ChartCurrency) {
  const width = useElementWidth(box)
  const code = computed(() => fx.currency())
  const locale = computed(() => currencyLocale(code.value))

  // API history is in million USD. Convert in whole units, then scale back to millions of the selected
  // currency. USD is passed through untouched so the original values are shown exactly.
  const toMillions = (v: number) => (code.value === BASE_CURRENCY ? v : fx.convert(v * 1_000_000) / 1_000_000)
  const data = computed(() => ({
    slots: series.value.slots.map(s => ({ year: s.year, value: s.value === null ? null : toMillions(s.value) })),
    max: toMillions(series.value.max),
    latestYear: series.value.latestYear,
  })) // derived copy; the API data in `series` is never modified

  const num = (v: number) => formatMillionNumber(v, locale.value)
  const phrase = (v: number) => `${num(v)} million ${code.value}`
  const unit = computed(() => `Million ${code.value}`)

  const plotW = computed(() => Math.max(40, width.value - MARGIN.l - MARGIN.r))
  const scale = computed(() => niceScale(data.value.max))
  const slotW = computed(() => plotW.value / Math.max(1, data.value.slots.length))
  const baseY = MARGIN.t + PLOT_H
  const yOf = (v: number) => baseY - (v / scale.value.top) * PLOT_H

  const points = computed(() => data.value.slots.map((s, i) => ({
    ...s, i,
    x0: MARGIN.l + slotW.value * i,
    cx: MARGIN.l + slotW.value * (i + 0.5),
    y: s.value === null ? null : yOf(s.value),
    latest: s.value !== null && s.year === data.value.latestYear,
  })))
  const ticks = computed(() => scale.value.ticks.map(t => ({ y: yOf(t), label: formatTick(t, scale.value.step, locale.value) })))
  const every = computed(() => Math.max(1, Math.ceil(58 / slotW.value)))
  const xLabels = computed(() => points.value
    .filter(p => (points.value.length - 1 - p.i) % every.value === 0) // always keeps the latest year
    .map(p => ({ x: p.cx, text: p.year, dim: p.value === null })))

  const active = ref<number | null>(null)
  const tip = computed(() => {
    const p = active.value === null ? undefined : points.value[active.value]
    if (!p) return null
    return {
      year: p.year,
      text: p.value === null ? 'No data reported' : `${formatMoney(p.value, code.value)} million`,
      latest: p.latest,
      left: Math.min(Math.max(p.cx, 76), width.value - 76),
      top: p.y ?? MARGIN.t + PLOT_H / 2,
    }
  })
  const summary = computed(() => `Export value in millions of ${code.value} by financial year. ` +
    points.value.filter(p => p.value !== null).map(p => `${p.year}: ${num(p.value!)}`).join('; ') + '.')

  return { width, plotW, plotH: PLOT_H, baseY, slotW, points, ticks, xLabels, active, tip, summary, unit, num, phrase }
}
