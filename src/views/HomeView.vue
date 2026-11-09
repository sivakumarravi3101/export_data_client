<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import DestinationSelect from "@/components/DestinationSelect.vue";
import { GlobeScene } from "@/three/GlobeScene";
import { getCountryCoordinates } from "@/data/countryCoordinates";
import { getCountries } from "@/services/marketInsightService";
import type { Country } from "@/models/country";

const router = useRouter();
const host = ref<HTMLElement>();
const countries = ref<Country[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const webglError = ref(false);
const selectedId = ref<number | null>(null);
const busy = ref(false);
let globe: GlobeScene | null = null;

const selected = computed(() =>
  countries.value.find((c) => c.id === selectedId.value)
);

function syncMarkers() {
  globe?.setDestinations(
    countries.value.flatMap((c) => {
      const coords = getCountryCoordinates(c.name);
      if (!coords) {
        console.warn(`[Globe] no coordinates mapped for "${c.name}"`);
        return [];
      }
      return [{ id: c.id, name: c.name, coords }];
    })
  );
}

async function loadCountries() {
  loading.value = true;
  error.value = null;
  try {
    countries.value = await getCountries();
    syncMarkers();
  } catch {
    error.value = "Could not load destinations.";
  } finally {
    loading.value = false;
  }
}

function openCountry(c: Country) {
  return router.push({
    name: "country",
    params: { countryId: c.id },
    query: { name: c.name },
  });
}

async function onSelect(id: number) {
  const c = countries.value.find((x) => x.id === id);
  if (!c || busy.value) return;
  selectedId.value = id;
  busy.value = true;
  try {
    const coords = getCountryCoordinates(c.name);
    if (globe && coords) await globe.flyTo({ id: c.id, name: c.name, coords }); // resolves only after arrival
    await openCountry(c);
  } catch (e) {
    console.error(e);
    globe?.reset();
    busy.value = false;
  }
}

onMounted(() => {
  try {
    globe = new GlobeScene(host.value!);
  } catch (e) {
    console.error(e);
    webglError.value = true;
  }
  void loadCountries();
});
onBeforeUnmount(() => {
  globe?.dispose();
  globe = null;
});
</script>

<template>
  <main class="hero">
    <section class="copy">
      <h1>Connecting India to Global Markets</h1>
      <p class="lead">
        Explore India's export opportunities across international destinations.
        Select a country to discover its export-product demand and trade
        insights.
      </p>
      <DestinationSelect
        :countries="countries"
        :loading="loading"
        :error="error"
        :disabled="busy"
        :selected-id="selectedId"
        @select="onSelect"
        @retry="loadCountries"
      />
      <p class="hint">
        Choose a destination to watch an export shipment travel from India, then
        open that market's products.
      </p>
    </section>

    <section
      class="stage"
      aria-label="Interactive 3D globe of India's export destinations"
    >
      <div ref="host" class="canvas-host" />
      <p v-if="webglError" class="stage-note">
        3D globe unavailable in this browser. You can still pick a destination.
      </p>
      <Transition name="chip">
        <div v-if="busy && selected" class="chip">
          India to {{ selected.name }}
        </div>
      </Transition>
    </section>
  </main>
</template>

<style scoped>
.hero {
  min-height: 90svh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 24px;
  padding: 32px clamp(20px, 5vw, 72px);
  overflow: visible;
  background: radial-gradient(
      ellipse at 70% 45%,
      rgba(24, 78, 160, 0.28),
      transparent 62%
    ),
    var(--bg);
}
.copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 520px;
}
h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4.6vw, 3.9rem);
  line-height: 1.04;
  letter-spacing: -0.025em;
  font-weight: 650;
}
.lead {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--muted);
  max-width: 46ch;
}
.hint {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--muted);
  max-width: 50ch;
}
.stage {
  position: relative;
  height: min(82vh, 780px);
  min-height: 360px;
}
.canvas-host {
  position: absolute;
  inset: 0;
}
.stage-note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--muted);
  text-align: center;
  padding: 24px;
}
.chip {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 0.9rem;
  color: var(--green);
  background: var(--glass);
  border: 1px solid rgba(53, 240, 140, 0.35);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.chip-enter-active,
.chip-leave-active {
  transition: opacity 0.35s;
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
}
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    align-content: start;
    padding-top: 40px;
  }
  .stage {
    height: 62svh;
  }
}
</style>
