/**
 * Pre-deploy SEO audit of the prerendered site in dist/.   npm run seo:audit
 * Exits 1 if anything that would hurt indexing is found. Checks every URL listed in sitemap.xml:
 * file exists, one canonical equal to its own URL, indexable robots, unique title/description, one H1,
 * valid JSON-LD, preloaded state present, og:image set. Also checks robots.txt and the 404 page.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

const root = process.cwd(), dist = path.join(root, 'dist')
const env = { ...loadEnv('production', root, ['VITE_']), ...process.env }
const SITE = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
const INDEXABLE = env.VITE_SITE_INDEXABLE === 'true'
const problems = new Map()
const bad = (k, v) => problems.set(k, [...(problems.get(k) ?? []), v])
const one = (h, re) => re.exec(h)?.[1]

if (!SITE) { console.error('VITE_SITE_URL is not set'); process.exit(1) }
const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8').catch(() => '')
if (INDEXABLE && (/Disallow:\s*\/\s*$/m.test(robots) || !robots.includes(`Sitemap: ${SITE}/sitemap.xml`))) bad('robots.txt', 'production robots.txt blocks the site or lacks the Sitemap line')
if (!INDEXABLE && !/Disallow:\s*\/\s*$/m.test(robots)) bad('robots.txt', 'non-production build must Disallow all')

const locs = []
const index = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
for (const f of /<sitemapindex/.test(index) ? [...index.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => path.basename(m[1])) : ['sitemap.xml'])
  locs.push(...[...(await readFile(path.join(dist, f), 'utf8')).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')))
if (new Set(locs).size !== locs.length) bad('sitemap', 'duplicate URLs')

const titles = new Map(), descs = new Map()
for (const url of locs) {
  const p = url.slice(SITE.length) || '/'
  const file = p === '/' ? path.join(dist, 'index.html') : path.join(dist, ...p.split('/').filter(Boolean), 'index.html')
  if (!url.startsWith(SITE)) { bad('sitemap URL on wrong origin', url); continue }
  if (!existsSync(file)) { bad('sitemap URL without a file', url); continue }
  const h = await readFile(file, 'utf8')
  const title = one(h, /<title>(.*?)<\/title>/s), desc = one(h, /<meta name="description" content="(.*?)"/)
  const canon = [...h.matchAll(/<link rel="canonical" href="(.*?)"/g)].map(m => m[1])
  const rob = one(h, /<meta name="robots" content="(.*?)"/) ?? ''
  if (canon.length !== 1 || canon[0] !== url) bad('canonical is not the page URL', `${url} -> ${canon.join(',') || 'none'}`)
  if (INDEXABLE && /noindex/.test(rob)) bad('noindex page listed in sitemap', url)
  if (!title || title.length > 75) bad('title missing or too long', `${url} (${title?.length ?? 0})`)
  if (!desc || desc.length > 160) bad('description missing or > 160 chars', `${url} (${desc?.length ?? 0})`)
  if ((h.match(/<h1[\s>]/g) ?? []).length !== 1) bad('page must have exactly one H1', url)
  if (!h.includes(`og:image" content="${SITE}/`)) bad('missing og:image', url)
  if (!h.includes('window.__PRELOAD__')) bad('no preloaded state (page would not hydrate)', url)
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    try { JSON.parse(m[1].replace(/\\u003c/g, '<')) } catch { bad('invalid JSON-LD', url) }
  }
  titles.set(title, [...(titles.get(title) ?? []), url]); descs.set(desc, [...(descs.get(desc) ?? []), url])
}
for (const [t, us] of titles) if (us.length > 1) bad('duplicate title', `"${t}" on ${us.length} pages, e.g. ${us[0]}`)
for (const [d, us] of descs) if (us.length > 1) bad('duplicate description', `${us.length} pages, e.g. ${us[0]}`)
const nf = existsSync(path.join(dist, '404.html')) ? await readFile(path.join(dist, '404.html'), 'utf8') : ''
if (!/noindex/.test(nf)) bad('404.html', 'missing or not noindex')

console.log(`[audit] ${locs.length} sitemap URLs checked, ${titles.size} distinct titles`)
if (problems.size) {
  for (const [k, v] of problems) console.error(`✗ ${k} (${v.length}):\n    ${v.slice(0, 5).join('\n    ')}`)
  process.exit(1)
}
console.log('[audit] OK: no indexing problems found')
