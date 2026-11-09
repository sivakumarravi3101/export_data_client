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
import { monotonePath, type HistorySeries } from "@/lib/historyChart";
import type { CurrencyCode } from "@/lib/currency";

const props = defineProps<{
  series: HistorySeries;
  convert: (usd: number) => number;
  currency: CurrencyCode;
}>();
const box = ref<HTMLElement | null>(null);
const c = useHistoryChart(
  computed(() => props.series),
  box,
  { convert: (usd) => props.convert(usd), currency: () => props.currency }
);

type Pt = { x: number; y: number };
// Consecutive reported years form a smooth run; a missing year splits the line (joined by a dashed link).
const runs = computed(() => {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of c.points.value) {
    if (p.y === null) {
      if (cur.length) out.push(cur);
      cur = [];
    } else cur.push({ x: p.cx, y: p.y });
  }
  if (cur.length) out.push(cur);
  return out;
});
const lines = computed(() =>
  runs.value.map((r) => {
    const d = monotonePath(r);
    return {
      d,
      area:
        r.length > 1
          ? `${d} L${r[r.length - 1]!.x},${c.baseY} L${r[0]!.x},${c.baseY} Z`
          : null,
    };
  })
);
const links = computed(() =>
  runs.value.slice(1).map((r, i) => {
    const a = runs.value[i]![runs.value[i]!.length - 1]!,
      b = r[0]!;
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  })
);
const activePoint = computed(() =>
  c.active.value === null ? null : c.points.value[c.active.value] ?? null
);
</script>

<template>
  <ChartPanel
    title="Global export history"
    description="Overall global export value by financial year"
    :unit="c.unit.value"
    :empty="!series.hasData"
    empty-text="No global export history is available."
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
          <linearGradient id="gha-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#22c3ff" stop-opacity=".38" />
            <stop offset="1" stop-color="#22c3ff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="gha-line" x1="0" y1="0" x2="1" y2="0">
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
        <path
          v-for="(l, i) in lines"
          :key="'a' + i"
          v-show="l.area"
          class="area"
          :d="l.area ?? ''"
          fill="url(#gha-area)"
        />
        <line
          v-for="(g, i) in links"
          :key="'g' + i"
          :x1="g.x1"
          :y1="g.y1"
          :x2="g.x2"
          :y2="g.y2"
          stroke="#0a63d8"
          stroke-opacity=".5"
          stroke-width="2"
          stroke-dasharray="4 5"
        />
        <path
          v-for="(l, i) in lines"
          :key="'l' + i"
          class="line"
          :d="l.d"
          pathLength="1"
          fill="none"
          stroke="url(#gha-line)"
          stroke-width="2.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <line
          v-if="activePoint && activePoint.y !== null"
          :x1="activePoint.cx"
          :x2="activePoint.cx"
          :y1="MARGIN.t"
          :y2="c.baseY"
          stroke="#0a63d8"
          stroke-opacity=".25"
        />
        <template v-for="p in c.points.value" :key="p.year">
          <circle
            v-if="p.y !== null"
            class="dot"
            :cx="p.cx"
            :cy="p.y"
            :r="c.active.value === p.i ? 6.5 : p.latest ? 5.5 : 4"
            :fill="p.latest ? '#0a63d8' : '#ffffff'"
            stroke="#0a63d8"
            stroke-width="2"
          />
          <text
            v-if="p.latest && p.value !== null"
            :x="p.cx"
            :y="(p.y ?? 0) - 12"
            text-anchor="middle"
            font-size="11"
            font-weight="600"
            fill="#0a4fb0"
          >
            {{ c.num(p.value) }}
          </text>
        </template>
        <rect
          v-for="p in c.points.value"
          :key="'hit' + p.year"
          :x="p.x0"
          :y="MARGIN.t"
          :width="c.slotW.value"
          :height="c.plotH"
          fill="transparent"
          tabindex="0"
          :aria-label="`${p.year}: ${
            p.value === null ? 'no data' : c.phrase(p.value)
          }`"
          @pointerenter="c.active.value = p.i"
          @focus="c.active.value = p.i"
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
.line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 1.1s ease-out 0.1s forwards;
}
.area {
  opacity: 0;
  animation: fade 0.8s ease 0.5s forwards;
}
.dot {
  opacity: 0;
  animation: fade 0.4s ease 0.9s forwards;
  transition: r 0.12s;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fade {
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .line {
    animation: none;
    stroke-dashoffset: 0;
  }
  .area,
  .dot {
    animation: none;
    opacity: 1;
  }
}
</style>
