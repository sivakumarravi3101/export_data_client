// @vitest-environment jsdom
// Boots the real client app on top of the prerendered HTML produced by `npm run build:site` and fails on any
// hydration mismatch or unexpected API request. Run: npx vitest run tests/hydration.test.ts  (needs dist/ and vitest + jsdom)
import { readFileSync } from 'node:fs'
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { createHead } from '@unhead/vue/client'

// jsdom has no ResizeObserver (browsers do); the charts only use it to measure their width after mount.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const get = vi.fn()
vi.mock('@/http/client', () => ({ default: { get: (u: string) => get(u) } }))

const pages = [
  { path: '/', file: 'dist/index.html', route: 'home' },
  { path: '/country/japan', file: 'dist/country/japan/index.html', route: 'country' },
  { path: '/country/japan/product/12099160-tomato-seeds', file: 'dist/country/japan/product/12099160-tomato-seeds/index.html', route: 'product' },
  { path: '/country/japan/product/99999999-zz-no-data-product', file: 'dist/country/japan/product/99999999-zz-no-data-product/index.html', route: 'product' },
]

describe.each(pages)('hydrates $path', ({ path, file, route }) => {
  it('without mismatches or API calls, and keeps SEO tags in the head', async () => {
    vi.resetModules(); get.mockReset()
    const html = readFileSync(file, 'utf8')
    const preload = JSON.parse(/window\.__PRELOAD__=(.*?)<\/script>/s.exec(html)![1]!)
    document.body.innerHTML = `<div id="app">${/<div id="app">([\s\S]*)<\/div>\s*<\/body>/.exec(html)![1]}</div>`
    const before = document.getElementById('app')!.innerHTML
    window.history.pushState({}, '', path)

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createApplication } = await import('@/app')
    const { applyPreloadCaches } = await import('@/ssr/preload')
    applyPreloadCaches(preload)
    const { app, router } = createApplication({ server: false, hydrate: true, head: createHead(), preload })
    await router.isReady()
    expect(String(router.currentRoute.value.name)).toBe(route)
    app.mount('#app')
    for (let i = 0; i < 5; i++) { await nextTick(); await new Promise(r => setTimeout(r, 0)) }

    const issues = [...warn.mock.calls, ...error.mock.calls].map(c => String(c[0])).filter(m => /hydrat|mismatch/i.test(m))
    if (issues.length) console.log('HYDRATION DETAIL:', JSON.stringify([...warn.mock.calls].map(c => c.map(x => (x && x.outerHTML ? x.outerHTML.slice(0, 160) : String(x)).slice(0, 220))), null, 1))
    expect(issues).toEqual([])
    expect(get).not.toHaveBeenCalled() // everything came from the embedded state
    expect(document.getElementById('app')!.innerHTML.length).toBeGreaterThan(before.length * 0.9) // content still there after hydration
    expect(document.title.length).toBeGreaterThan(10)
    expect(document.querySelectorAll('link[rel=canonical]').length).toBe(1) // client head took over the SSR tag, no duplicate
    expect(document.querySelectorAll('meta[name=description]').length).toBe(1)
    warn.mockRestore(); error.mockRestore()
  })
})
