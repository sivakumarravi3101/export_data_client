<script setup lang="ts">
defineProps<{
  ticks: { y: number; label: string }[];
  labels: { x: number; text: string; dim: boolean }[];
  left: number;
  right: number;
  baseY: number;
  unit: string;
}>();
</script>

<template>
  <g>
    <g v-for="t in ticks" :key="t.y">
      <line
        :x1="left"
        :x2="right"
        :y1="t.y"
        :y2="t.y"
        stroke="#0d1f3c"
        stroke-opacity=".1"
        stroke-dasharray="3 4"
      />
      <text
        :x="left - 8"
        :y="t.y + 4"
        text-anchor="end"
        font-size="11"
        fill="#50627f"
        >{{ t.label }}</text
      >
    </g>
    <line
      :x1="left"
      :x2="right"
      :y1="baseY"
      :y2="baseY"
      stroke="#0d1f3c"
      stroke-opacity=".25"
    />
    <text
      v-for="l in labels"
      :key="l.text"
      :x="l.x"
      :y="baseY + 20"
      text-anchor="middle"
      font-size="11"
      :fill="l.dim ? '#93a1b8' : '#50627f'"
      >{{ l.text }}</text
    >
    <text x="0" y="12" font-size="10" fill="#50627f">{{ unit }}</text>
  </g>
</template>
