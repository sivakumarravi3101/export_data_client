// @vitest-environment jsdom
// SPA path (no prerendered state): real client app + real axios against the API. Run with VITE_API_BASE_URL pointing at an API.
import { describe, it, expect, vi } from 'vitest'
import { createHead } from '@unhead/vue/client'

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
const until = async (cond: () => boolean, ms = 4000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timeout waiting for condition'); await new Promise(r => setTimeout(r, 25)) } }

let mounted: { unmount(): void } | null = null // each test must tear down its app, or it keeps writing to the shared <head>
async function boot(path: string) {
  mounted?.unmount(); mounted = null
  vi.resetModules(); document.head.innerHTML = ''; document.body.innerHTML = '<div id="app"></div>'
  window.history.pushState({}, '', path)
  const { createApplication } = await import('@/app')
  const { app, router } = createApplication({ server: false, hydrate: false, head: createHead(), preload: {} })
  await router.isReady(); app.mount('#app'); mounted = app
  return { router }
}
const meta = (n: string) => document.head.querySelector(`meta[name="${n}"]`)?.getAttribute('content')

describe('SPA mode', () => {
  it('product URL: fetches data with the country id, sets title/canonical/robots/JSON-LD', async () => {
    const { router } = await boot('/country/japan/product/12099160-tomato-seeds')
    await until(() => !!document.querySelector('.overview .primary strong'))
    expect(router.currentRoute.value.fullPath).toBe('/country/japan/product/12099160-tomato-seeds')
    expect(document.querySelector('h1')!.textContent).toContain('Tomato Seeds exports to Japan')
    expect(document.title).toMatch(/^Tomato Seeds Exports from India to Japan/)
    expect(document.head.querySelector('link[rel=canonical]')!.getAttribute('href')).toBe('https://www.exportdata.test/country/japan/product/12099160-tomato-seeds')
    expect(meta('robots')).toContain('index, follow')
    expect([...document.head.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent!)['@type']).sort()).toEqual(['BreadcrumbList', 'Dataset'])
    expect(document.querySelectorAll('a.card[href^="/country/japan/product/"]').length).toBeGreaterThan(3) // product cards are real links
  })
  it('old numeric URL /country/8 redirects to the slug URL', async () => {
    const { router } = await boot('/country/8')
    await until(() => router.currentRoute.value.name === 'country')
    expect(router.currentRoute.value.fullPath).toBe('/country/japan')
  })
  it('unknown country or malformed product key shows the noindex 404 page (URL kept, no redirect to "/")', async () => {
    for (const p of ['/country/atlantis', '/country/japan/product/not-a-code', '/definitely/not/a/page']) {
      const { router } = await boot(p)
      await until(() => router.currentRoute.value.name === 'not-found')
      expect(router.currentRoute.value.path).toBe(p)
      await until(() => document.title.startsWith('Page not found'))
      expect(meta('robots')).toBe('noindex, follow')
    }
  })
  it('stale product slug is corrected to the canonical URL without breaking the page', async () => {
    const { router } = await boot('/country/japan/product/12099160-old-name')
    await until(() => router.currentRoute.value.fullPath === '/country/japan/product/12099160-tomato-seeds')
    await until(() => !!document.querySelector('.overview .primary strong'))
  })
  it('product with no country data is noindex and has no structured data', async () => {
    await boot('/country/japan/product/99999999-zz-no-data-product')
    await until(() => document.body.textContent!.includes('No market data is available for Japan'))
    expect(meta('robots')).toBe('noindex, follow')
    expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(0)
  })
})
