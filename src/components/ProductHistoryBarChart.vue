<script setup lang="ts">
import { computed, ref } from "vue";
import ChartPanel from "@/components/ChartPanel.vue";
import HistoryAxes from "@/components/HistoryAxes.vue";
import HistoryTooltip from "@/components/HistoryTooltip.vue";
import {
  CHART_H,
  MARGIN,
  useHistoryChart,
} from "@/composables/useHistoryChart";
import type { HistorySeries } from "@/lib/historyChart";
import type { CurrencyCode } from "@/lib/currency";

const props = defineProps<{
  series: HistorySeries;
  productName: string;
  convert: (usd: number) => number;
  currency: CurrencyCode;
}>();
const box = ref<HTMLElement | null>(null);
const c = useHistoryChart(
  computed(() => props.series),
  box,
  { convert: (usd) => props.convert(usd), currency: () => props.currency }
);

const barW = computed(() => Math.min(60, c.slotW.value * 0.6));
// Rounded top corners only; a zero value is drawn as a 2px sliver so it reads as "0", not "missing".
const barPath = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(8, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${
    x + w
  },${y} ${x + w},${y + r} V${y + h} Z`;
};
const bars = computed(() =>
  c.points.value.map((p) => {
    if (p.y === null) return { ...p, d: "" };
    const h = Math.max(c.baseY - p.y, 2);
    return {
      ...p,
      d: barPath(p.cx - barW.value / 2, c.baseY - h, barW.value, h),
    };
  })
);
</script>

<template>
  <ChartPanel
    title="Product export history"
    :description="`Export value of ${productName} by financial year`"
    :unit="c.unit.value"
    :empty="!series.hasData"
    empty-text="No export history is available for this product."
  >
    <div ref="box" class="box" @pointerleave="c.active.value = null">
      <svg
        v-if="series.hasData"
        xmlns="http://www.w3.org/2000/svg"
        :width="c.width.value"
        :height="CHART_H"
        role="img"
        :aria-label="c.summary.value"
      >
        <defs>
          <linearGradient id="phb-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9fd3ff" />
            <stop offset="1" stop-color="#5aa2ff" />
          </linearGradient>
          <linearGradient id="phb-latest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#22c3ff" />
            <stop offset="1" stop-color="#0a63d8" />
          </linearGradient>
        </defs>
        <HistoryAxes
          :ticks="c.ticks.value"
          :labels="c.xLabels.value"
          :left="MARGIN.l"
          :right="MARGIN.l + c.plotW.value"
          :base-y="c.baseY"
          :unit="c.unit.value"
        />
        <g v-for="b in bars" :key="b.year">
          <template v-if="b.value !== null">
            <path
              class="bar"
              :d="b.d"
              :fill="b.latest ? 'url(#phb-latest)' : 'url(#phb-bar)'"
              :opacity="
                c.active.value === null || c.active.value === b.i ? 1 : 0.55
              "
              :style="{ '--i': b.i }"
            />
            <text
              v-if="b.latest"
              :x="b.cx"
              :y="(b.y ?? 0) - 7"
              text-anchor="middle"
              font-size="11"
              font-weight="600"
              fill="#0a4fb0"
            >
              {{ c.num(b.value) }}
            </text>
          </template>
          <text
            v-else
            :x="b.cx"
            :y="c.baseY - 8"
            text-anchor="middle"
            font-size="10"
            fill="#93a1b8"
          >
            n/a
          </text>
        </g>
        <rect
          v-for="b in bars"
          :key="'hit' + b.year"
          :x="b.x0"
          :y="MARGIN.t"
          :width="c.slotW.value"
          :height="c.plotH"
          fill="transparent"
          tabindex="0"
          :aria-label="`${b.year}: ${
            b.value === null ? 'no data' : c.phrase(b.value)
          }`"
          @pointerenter="c.active.value = b.i"
          @focus="c.active.value = b.i"
          @blur="c.active.value = null"
        />
      </svg>
      <HistoryTooltip :tip="c.tip.value" />
    </div>
  </ChartPanel>
</template>

<style scoped>
.box {
  position: relative;
  width: 100%;
  min-height: 1px;
}
svg {
  display: block;
  overflow: visible;
}
rect:focus-visible {
  outline: 2px solid var(--lg-accent);
}
.bar {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 70ms);
  transition: opacity 0.15s;
}
@keyframes grow {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
  }
}
</style>
