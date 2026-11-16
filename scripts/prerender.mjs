/**
 * Build-time prerender + SEO files.
 *   npm run build:site   (client build -> SSR build -> this script)
 *
 * For every indexable URL it renders static HTML (with head tags, JSON-LD and the page's data embedded for hydration),
 * then writes sitemap.xml, robots.txt, 404.html, 200.html (SPA shell) and _redirects into dist/.
 *
 * Env (VITE_* are read from .env / .env.production / the process environment):
 *   VITE_SITE_URL           required, e.g. https://www.example.com
 *   VITE_SITE_INDEXABLE     "true" only for the real production site; anything else => robots.txt Disallow + noindex
 *   PRERENDER_CONCURRENCY   parallel API calls/renders (default 6)
 *   PRERENDER_ROWS_PAGE     rows per request while listing a country's products (default 500)
 *   PRERENDER_MAX_PRODUCTS  cap products per country, for quick dry runs (default 0 = all)
 *   PRERENDER_MAX_FAIL      tolerated share of failed product pages, 0-1 (default 0.02)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const root = process.cwd()
const env = { ...loadEnv('production', root, ['VITE_', 'PRERENDER_']), ...process.env }
const SITE_URL = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
const INDEXABLE = env.VITE_SITE_INDEXABLE === 'true'
const CONCURRENCY = Number(env.PRERENDER_CONCURRENCY ?? 2)
const ROWS_PAGE = Number(env.PRERENDER_ROWS_PAGE ?? 100)
const MAX_PRODUCTS = Number(env.PRERENDER_MAX_PRODUCTS ?? 0)
const MAX_FAIL = Number(env.PRERENDER_MAX_FAIL ?? 0.02)
const SEED_ROWS = 51 // must equal the app's first request: pageSize (50) + 1
const SITEMAP_LIMIT = 45000 // protocol max is 50,000 URLs per file
const API_TOKEN = env.PRERENDER_API_TOKEN
if (!API_TOKEN) {
  die('PRERENDER_API_TOKEN is missing. Check your Vercel environment variables.')
}
const dist = path.join(root, 'dist')
const die = (msg) => { console.error(`\n[prerender] ERROR: ${msg}\n`); process.exit(1) }
if (!/^https?:\/\/[^/]+/.test(SITE_URL)) die('VITE_SITE_URL is missing or invalid (e.g. https://www.example.com). It is needed for canonical URLs and the sitemap.')
if (!existsSync(path.join(dist, 'index.html'))) die('dist/index.html not found. Run the client build first (npm run build:site does everything).')
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js')
if (!existsSync(ssrEntry)) die('dist-ssr/entry-server.js not found. Run `npm run build:ssr` first.')

const app = await import(pathToFileURL(ssrEntry).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function retry(fn, label, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      const status = e?.response?.status
      const body = e?.response?.data

      // A 400 & 404 is usually a bad request; retrying the same request won't help.
      if (status === 404 ||status === 400) {
        throw new Error(
          `${label}: HTTP 400 - ${
            typeof body === 'string' ? body : JSON.stringify(body)
          }`
        )
      }

      if (i >= tries - 1) {
        throw new Error(
          `${label}: HTTP ${status ?? 'Network Error'} - ${
            typeof body === 'string' ? body : JSON.stringify(body) ?? e.message
          }`
        )
      }

      const waitMs = status === 429
        ? 10000
        : 2000 * 2 ** i

      console.log(`[prerender] ${label}: retrying in ${waitMs / 1000}s`)
      await sleep(waitMs)
    }
  }
}
async function pool(items, limit, worker) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await worker(items[i], i) }
  }))
}
const day = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 10) : undefined)
const maxDay = (a, b) => (!a ? b : !b ? a : a > b ? a : b)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
// Only the fields the product list uses; keeps the embedded state small.
const slim = (r) => ({ hsCode: r.hsCode, productName: r.productName, categoryId: r.categoryId, categoryName: r.categoryName, year: r.year, countryName: r.countryName })

async function writePage(urlPath, html) {
  const file = urlPath === '/' ? path.join(dist, 'index.html') : path.join(dist, ...urlPath.split('/').filter(Boolean), 'index.html')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

console.log(`[prerender] site ${SITE_URL}  indexable=${INDEXABLE}  api calls x${CONCURRENCY}`)
const countries = await retry(() => app.getCountries(), 'countries')
const categories = await retry(() => app.getCategories(), 'categories')
if (!countries.length) die('The API returned no countries; refusing to publish an empty site.')
const index = app.countryIndexFor(countries)
const base = { countries, categories }

const sitemap = [] // { path, lastmod }
const stats = { countryPages: 0, productPages: 0, skippedNoData: 0, failed: [] }

// SPA shell (no preloaded state => client mounts without hydration). Useful as the host's SPA fallback.
await writeFile(path.join(dist, '200.html'), template.replace('<!--preload-->', '').replace('<!--app-html-->', ''))

async function renderChecked(url, preload, expected) {
  const { html, routeName } = await app.render(url, preload, template)
  if (routeName !== expected) throw new Error(`${url} rendered route "${routeName}", expected "${expected}"`)
  return html
}

let homeLastmod
for (const c of countries) {
  const slug = index.slugById.get(c.id)
  // 1) list the country's products (rows are per year/state/port, so de-duplicate by HS code)
  const products = new Map() // hsCode -> { name, lastmod }
  let seedRows = []
  let countryLastmod
  const seen = new Set()
  for (let skip = 0, guard = 0; guard < 5000; guard++) {
    const res = await retry(() => app.getProductsByCountry(c.id, { top: ROWS_PAGE, skip },API_TOKEN), `products ${c.name} @${skip}`)
    const items = res.items ?? []
    if (!items.length) break
    if (items.every((r) => seen.has(r.id))) { 
      //uncomment for development
      // console.warn(`[prerender] ${c.name}: API ignored $skip, stopping at ${skip}`); 
      break 
    }
    if (skip === 0) seedRows = items.slice(0, SEED_ROWS).map(slim)
    for (const r of items) {
      seen.add(r.id)
      const d = day(r.createdAt)
      countryLastmod = maxDay(countryLastmod, d)
      const p = products.get(r.hsCode)
      if (!p) products.set(r.hsCode, { name: r.productName, lastmod: d })
      else p.lastmod = maxDay(p.lastmod, d)
    }
    skip += items.length // advance by what the API actually returned: it may cap $top below ROWS_PAGE
    await sleep(1200)
  }
  const preloadCountry = { ...base, countryProducts: { countryId: c.id, rows: seedRows } }

  // 2) country page
  const countryUrl = `/country/${slug}`
  await writePage(countryUrl, await retry(() => renderChecked(countryUrl, preloadCountry, 'country'), `render ${countryUrl}`, 2))
  sitemap.push({ path: countryUrl, lastmod: countryLastmod })
  homeLastmod = maxDay(homeLastmod, countryLastmod)
  stats.countryPages++

  // 3) product pages: only where the API has a country-specific insight (quality gate against thin pages)
  let list = [...products.entries()]
  if (MAX_PRODUCTS > 0) list = list.slice(0, MAX_PRODUCTS)
  let ok = 0
  await pool(list, CONCURRENCY, async ([hs, p]) => {
    const url = `${countryUrl}/product/${app.buildProductKey(hs, p.name)}`
    try {
      let data
      try { data = await retry(() => app.getExportProductByHsncode(hs, c.id, API_TOKEN), `demand ${hs}/${c.name}`) }
      catch (e) {
  const message = String(e?.message ?? e)

  const isNoData =
    /\b404\b/.test(message) ||
    /No market\s*insights found/i.test(message)

  if (isNoData) {
    stats.skippedNoData++
    return
  }

  throw e
}
      // Render every listed product so internal links never dead-end. Pages without country data render as "noindex"
      // (see CountryView) and stay out of the sitemap, which only lists pages worth indexing.
      const html = await renderChecked(url, { ...preloadCountry, demand: { hsCode: hs, countryId: c.id, data } }, 'product')
      await writePage(url, html)
      if (data?.insights?.length) { sitemap.push({ path: url, lastmod: p.lastmod }); stats.productPages++; ok++ } else stats.skippedNoData++
    } catch (e) {
      stats.failed.push(`${url} (${e.message})`)
    }
  })
  console.log(`[prerender] ${c.name.padEnd(22)} ${String(products.size).padStart(5)} products, ${String(ok).padStart(5)} pages`)
}

// Home + 404
const homeHtml = await renderChecked('/', base, 'home')
await writePage('/', homeHtml)
sitemap.unshift({ path: '/', lastmod: homeLastmod })
await writeFile(path.join(dist, '404.html'), (await app.render('/page-not-found', base, template)).html)

// sitemap(s)
const urlset = (entries) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
  .map((e) => `  <url><loc>${esc(SITE_URL + (e.path === '/' ? '/' : e.path))}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
if (sitemap.length <= SITEMAP_LIMIT) {
  await writeFile(path.join(dist, 'sitemap.xml'), urlset(sitemap))
} else {
  const parts = Math.ceil(sitemap.length / SITEMAP_LIMIT)
  const today = new Date().toISOString().slice(0, 10)
  for (let i = 0; i < parts; i++) await writeFile(path.join(dist, `sitemap-${i + 1}.xml`), urlset(sitemap.slice(i * SITEMAP_LIMIT, (i + 1) * SITEMAP_LIMIT)))
  await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from({ length: parts }, (_, i) => `  <sitemap><loc>${SITE_URL}/sitemap-${i + 1}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`)
}

// robots.txt: staging/preview builds block everything; production allows everything and points to the sitemap
await writeFile(path.join(dist, 'robots.txt'), INDEXABLE
  ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : `# Non-production build: not for indexing\nUser-agent: *\nDisallow: /\n`)

// Netlify / Cloudflare Pages redirects for the old numeric country URLs (/country/12 -> /country/<slug>)
await writeFile(path.join(dist, '_redirects'), countries.map((c) => `/country/${c.id} /country/${index.slugById.get(c.id)} 301`).join('\n') + '\n')

console.log(`\n[prerender] done: ${stats.countryPages} country pages, ${stats.productPages} product pages, ${stats.skippedNoData} pages without country data (rendered as noindex, not in sitemap), ${sitemap.length} URLs in sitemap`)
if (stats.failed.length) {
  console.error(`[prerender] ${stats.failed.length} product pages failed:\n  ` + stats.failed.slice(0, 10).join('\n  '))
  const total = stats.productPages + stats.failed.length
  if (stats.failed.length / total > MAX_FAIL) die(`failure rate ${(100 * stats.failed.length / total).toFixed(1)}% exceeds PRERENDER_MAX_FAIL; not publishing a partial site.`)
}
