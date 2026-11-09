<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Country } from "@/models/country";

defineProps<{
  countries: Country[];
  loading: boolean;
  error: string | null;
  disabled: boolean;
  selectedId: number | null;
}>();
const emit = defineEmits<{ select: [id: number]; retry: [] }>();

const open = ref(false);
const root = ref<HTMLElement>();
const onOutside = (e: PointerEvent) => {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener("pointerdown", onOutside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onOutside));
function pick(id: number) {
  open.value = false;
  emit("select", id);
}
</script>

<template>
  <div ref="root" class="select" @keydown.esc="open = false">
    <button
      type="button"
      class="trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :disabled="disabled || loading || !!error || !countries.length"
      @click="open = !open"
    >
      <span :class="{ placeholder: !selectedId }">
        {{
          loading
            ? "Loading destinations…"
            : error
            ? "Destinations unavailable"
            : !countries.length
            ? "No destinations available"
            : countries.find((c) => c.id === selectedId)?.name ??
              "Select a destination country"
        }}
      </span>
      <svg
        class="chev"
        :class="{ up: open }"
        viewBox="0 0 20 20"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <path
          d="M5 7.5l5 5 5-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <ul
      v-if="open"
      class="menu"
      role="listbox"
      aria-label="Destination countries"
    >
      <li
        v-for="c in countries"
        :key="c.id"
        role="option"
        tabindex="0"
        :aria-selected="c.id === selectedId"
        @click="pick(c.id)"
        @keydown.enter.prevent="pick(c.id)"
        @keydown.space.prevent="pick(c.id)"
      >
        {{ c.name }}
      </li>
    </ul>
    <p v-if="error" class="err">
      {{ error }}
      <button type="button" @click="emit('retry')">Try again</button>
    </p>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  width: min(100%, 360px);
}
.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  font: inherit;
  font-size: 15px;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.trigger:hover:not(:disabled) {
  border-color: rgba(79, 209, 255, 0.5);
}
.trigger:focus-visible {
  outline: none;
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(79, 209, 255, 0.25);
}
.trigger:disabled {
  cursor: default;
  opacity: 0.7;
}
.placeholder {
  color: var(--muted);
}
.chev {
  flex: none;
  color: var(--cyan);
  transition: transform 0.2s;
}
.chev.up {
  transform: rotate(180deg);
}
.menu {
  position: absolute;
  z-index: 100;
  inset: calc(100% + 8px) 0 auto 0;

  margin: 0;
  padding: 6px;
  list-style: none;

  max-height: min(280px, 40vh);
  overflow-y: auto;
  overscroll-behavior: contain;

  border-radius: 12px;
  border: 1px solid var(--line);

  background: rgba(8, 16, 34, 0.92);

  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);

  scrollbar-width: thin;
  scrollbar-color: rgba(79, 209, 255, 0.5) transparent;
}

.menu::-webkit-scrollbar {
  width: 6px;
}

.menu::-webkit-scrollbar-thumb {
  background: rgba(79, 209, 255, 0.5);
  border-radius: 10px;
}
.menu li {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  color: var(--ink);
}
.menu li:hover,
.menu li:focus-visible {
  outline: none;
  background: rgba(79, 209, 255, 0.14);
}
.menu li[aria-selected="true"] {
  color: var(--green);
}
.err {
  margin: 10px 0 0;
  font-size: 13px;
  color: #ff9b9b;
}
.err button {
  background: none;
  border: 0;
  color: var(--cyan);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
