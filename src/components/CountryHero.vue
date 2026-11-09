<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { LandmarkImage } from "@/services/countryImageService";

const props = defineProps<{
  countryName: string;
  image: LandmarkImage | null;
  loaded: boolean;
}>();
const NEEDS_THE = [
  "united states",
  "united kingdom",
  "united arab emirates",
  "netherlands",
];
const placeName = computed(() =>
  NEEDS_THE.includes(props.countryName.toLowerCase())
    ? `the ${props.countryName}`
    : props.countryName
);
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div
      class="photo"
      :class="{ on: loaded }"
      :style="image ? { backgroundImage: `url(${image.url})` } : undefined"
    />
    <div class="veil" />
  </div>
  <header class="hero">
    <RouterLink to="/" class="lg-btn back">Back to globe</RouterLink>
    <h1>Explore {{ countryName }}</h1>
    <p>
      Discover India's export opportunities and product demand in
      {{ placeName }}.
    </p>
  </header>
  <a
    v-if="image && loaded"
    class="credit"
    :href="image.pageUrl"
    target="_blank"
    rel="noopener"
    >Photo: {{ image.title }}, Wikipedia</a
  >
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}
.photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 35%;
  opacity: 0;
  transition: opacity 0.9s ease;
}
.photo.on {
  opacity: 1;
}
/* light neutral veil keeps the photo visible but quiet behind the content */
.veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(246, 250, 255, 0.6) 40%,
    rgba(240, 246, 255, 0.78) 100%
  );
}
.hero {
  padding: 28px clamp(20px, 5vw, 72px) 8px;
  max-width: 1400px;
  margin: 0 auto;
}
.back {
  display: inline-block;
  margin-bottom: 26px;
}
h1 {
  margin: 0 0 10px;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 650;
  color: var(--lg-ink);
}
p {
  margin: 0;
  max-width: 52ch;
  font-size: clamp(1rem, 1.6vw, 1.2rem);
  line-height: 1.5;
  color: var(--lg-muted);
}
.credit {
  position: fixed;
  right: 10px;
  bottom: 8px;
  z-index: 5;
  font-size: 0.7rem;
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--lg-muted);
  background: rgba(255, 255, 255, 0.7);
  text-decoration: none;
}
.credit:hover {
  color: var(--lg-ink);
}
@media (max-width: 700px) {
  .photo {
    background-position: 40% 30%;
  }
}
</style>
