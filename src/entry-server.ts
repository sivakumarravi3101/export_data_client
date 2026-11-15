import { renderToString } from 'vue/server-renderer'
import { createHead, transformHtmlTemplate } from '@unhead/vue/server'
import { createApplication } from './app'
import { applyPreloadCaches, type Preload } from './ssr/preload'

export interface RenderResult { html: string; routeName: string }

/** Renders one URL into the HTML template (head tags via unhead, app markup, preload state). Used only by scripts/prerender.mjs. */
export async function render(url: string, preload: Preload, template: string): Promise<RenderResult> {
  applyPreloadCaches(preload)
  const head = createHead()
  const { app, router } = createApplication({ server: true, head, preload })
  await router.push(url)
  await router.isReady()
  const appHtml = await renderToString(app)
  const state = JSON.stringify(preload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  const withApp = template
    .replace('<!--preload-->', `<script>window.__PRELOAD__=${state}</script>`)
    .replace('<!--app-html-->', appHtml)
  return { html: await transformHtmlTemplate(head, withApp), routeName: String(router.currentRoute.value.name) }
}

// Re-exported so the prerender script uses the exact same API calls and URL rules as the app.
export { getCountries, getCategories, getProductsByCountry } from './services/marketInsightService'
export { getExportProductByHsncode } from './services/exportDemandService'
export { countryIndexFor } from './lib/countryIndex'
export { countryPath, productPath, buildProductKey } from './lib/slug'
