<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { usePageSeo } from '@/seo/usePageSeo'

// Static hosts cannot always return HTTP 404 for client-routed URLs, so tell crawlers explicitly.
usePageSeo(() => ({ title: 'Page not found', description: 'The page you were looking for does not exist.', path: '/404', noindex: true }))
</script>

<template>
  <main class="nf">
    <h1>Page not found</h1>
    <p>We couldn't find that page. Pick a destination on the globe to explore India's export products.</p>
    <RouterLink to="/" class="back">Back to the globe</RouterLink>
  </main>
</template>

<style scoped>
.nf { min-height: 100svh; display: grid; place-content: center; justify-items: start; gap: 14px; padding: 32px clamp(20px, 6vw, 80px); background: var(--bg); color: var(--ink); }
h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -.02em; }
p { margin: 0; max-width: 46ch; line-height: 1.6; color: var(--muted); }
.back { color: var(--cyan); }
</style>
