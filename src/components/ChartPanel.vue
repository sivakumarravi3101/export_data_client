<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  empty: boolean;
  emptyText: string;
  unit: string;
}>();
</script>

<template>
  <article class="lg-panel chart-panel">
    <header>
      <div>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <span class="unit">{{ unit }}</span>
    </header>
    <slot />
    <p v-if="empty" class="empty">{{ emptyText }}</p>
  </article>
</template>

<style scoped>
.chart-panel {
  min-width: 0;
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
h3 {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}
p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--lg-muted);
}
.unit {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  background: rgba(10, 99, 216, 0.1);
  color: #0a4fb0;
}
.empty {
  margin: 0;
  padding: 40px 8px;
  text-align: center;
  font-size: 0.9rem;
}
</style>
