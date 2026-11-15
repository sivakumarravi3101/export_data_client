import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
// comments:false mirrors the production template compiler, which is what produced the prerendered HTML.
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { comments: false } } })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/mock-api.ts'], // fixture API on :4010, no real backend needed
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:4010', VITE_SITE_URL: 'https://www.exportdata.test', VITE_SITE_NAME: 'India Export Data', VITE_SITE_INDEXABLE: 'true' },
  },
})
