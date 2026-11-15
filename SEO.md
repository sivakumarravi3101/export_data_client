# SEO & deployment runbook

## 1. Rendering decision: prerender + hydration

| Option                           | Verdict                                                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain SPA                        | Rejected. The HTML a crawler first receives is an empty `<div id="app">`. Google can render JS, but later and unreliably across thousands of pages (the API is also slow on cold start). Bing/social/LinkedIn previews don't render JS at all. |
| SSR (Node server / Nuxt)         | Not needed. Data only changes when new APEDA data is imported, so a server adds cost and ops for no benefit.                                                                                                                                   |
| **Prerender at build + hydrate** | **Chosen.** Every indexable URL is rendered to static HTML (head tags, JSON-LD, real content, charts) and the browser then hydrates it into the normal interactive app. Hosting stays a plain static host/CDN.                                 |

The Three.js globe is client-only (it is created in `onMounted`), so the prerendered home page contains the headline, intro text and
a plain list of links to every country; the globe appears after hydration.

**Freshness:** rebuild and redeploy whenever the backend data changes (CI job, scheduled build, or a webhook after an import).

## 2. URLs

| Page               | URL                                            | Notes                                                                                               |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Home               | `/`                                            |                                                                                                     |
| Country            | `/country/japan`                               | slug = lower-case country name; collisions get `-<id>`                                              |
| Product in country | `/country/japan/product/12099160-tomato-seeds` | `<hsCode>-<name-slug>`                                                                              |
| Old numeric URL    | `/country/8`                                   | redirects to the slug (client-side; `dist/_redirects` has real 301s for Netlify / Cloudflare Pages) |

- **HS code is the key; the slug is cosmetic.** HS code is what the API uses and is unique, and "HS 12099160" is itself a search query. Names are not unique or stable.
  A wrong/old slug is corrected to the canonical URL in the app, and `<link rel="canonical">` always names the canonical URL.
- Category filter, page number and currency are **not** in the URL, so there are no duplicate/parameter variants to index.
- Unknown URLs show a real "Page not found" page with `noindex` (never a redirect to `/`, which Google treats as a soft 404).

## 3. What every page carries

Title, meta description, canonical, robots, Open Graph/Twitter tags, `lang="en"`, one `<h1>`, and JSON-LD:
home `WebSite`; country `BreadcrumbList` + `CollectionPage` (+ `ItemList`); product `BreadcrumbList` + `Dataset` (built only from API data that is
visible on the page). Product pages **without a country-specific insight** are rendered `noindex, follow` and left out of the sitemap.

## 4. Build

```bash
cp .env       # or set these in your CI/host
VITE_API_BASE_URL=https://<api>/api/market-insight
VITE_SITE_URL=https://www.<your-domain>          # canonical origin, no trailing slash (also decide www vs non-www ONCE)
VITE_SITE_NAME=<Your brand>
VITE_SITE_INDEXABLE=true                         # ONLY for the real production build
```

| Command                  | What it does                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `npm run build`          | type-check + client build + SSR build + prerender + sitemap/robots/404/redirects → `dist/`                    |
| `npm run build-only`     | fast client-only build (no prerendering/SEO output). **Do not deploy this.**                                  |
| `npm run seo:audit`      | checks every sitemap URL in `dist/` (canonical, noindex, unique title/description, one H1, JSON-LD, og:image) |
| `npm test`               | self-contained tests (fixture API, no backend needed)                                                         |
| `npm run test:hydration` | builds against the fixture API, audits, hydrates each page type in jsdom, then deletes `dist/`                |

`VITE_SITE_INDEXABLE` defaults to off: staging/preview builds get `Disallow: /` in robots.txt and `noindex` on every page.
The build **fails** (instead of publishing a partial site) if the API returns no countries, or if more than `PRERENDER_MAX_FAIL` (2%) of product pages fail.
Tuning (env): `PRERENDER_CONCURRENCY` (6), `PRERENDER_ROWS_PAGE` (500), `PRERENDER_MAX_PRODUCTS` (cap per country for dry runs).
The build needs the API to be reachable and pays any cold-start delay once (calls are retried with back-off).

## 5. Hosting requirements

- **HTTP 404 for unknown URLs.** Serve `dist/404.html` with status 404 (Netlify and Cloudflare Pages do this automatically when `404.html` exists and there is
  no catch-all rewrite). Do **not** add `/* /index.html 200`. `dist/200.html` is only the SPA shell, for hosts that need a fallback file.
- Redirect `http→https` and the non-canonical host (`www` ↔ apex) with a 301.
- Cache: hashed `/assets/*` immutable for a year; HTML short (or revalidate), so a redeploy shows up quickly.
- Pick one trailing-slash behaviour; canonicals have none (except `/`).
- Replace `public/og-default.png` (generated placeholder) with branded 1200×630 art.

## 6. Google Search Console (you do these, after the first production deploy)

1. **Add a Domain property** (search.google.com/search-console → Add property → _Domain_, e.g. `your-domain.com`). Verify by adding the shown **DNS TXT record**
   at your DNS provider. A Domain property covers http/https and www/non-www.
2. **Check what Google may crawl first:** open `https://<domain>/robots.txt` — it must say `Allow: /` and list the sitemap (not `Disallow: /`;
   if it does, `VITE_SITE_INDEXABLE` was not `true` at build time).
3. **Submit the sitemap:** _Sitemaps_ → enter `sitemap.xml` → Submit. Status should become **Success** with the discovered-URL count matching `npm run build` output.
4. **URL Inspection** on: `/`, one country page, one product page, and one URL that should 404. For each:
   _Test live URL_ → **View tested page**: confirm the screenshot/HTML show real content (headline, product data), _Page fetch = Successful_, _Indexing allowed? = Yes_,
   and that **User-declared canonical = Google-selected canonical**. Then _Request indexing_ for `/` and a few key country pages (don't mass-request; use the sitemap).
5. **Rich results:** run `/country/<x>` and a product page through search.google.com/test/rich-results. `Dataset` is eligible for Dataset Search, not a classic rich result;
   warnings about optional fields (e.g. license) are fine.
6. **Monitor** (weekly for the first month): _Pages_ (indexing) report, _Sitemaps_ report, _Performance_ (queries, pages, countries, CTR), _Core Web Vitals_.
   Normal for a new site: many URLs sit in "Discovered / Crawled – currently not indexed" for weeks. Worry only about
   _Duplicate without user-selected canonical_, _Alternate page with proper canonical_ on pages you expect indexed, _Soft 404_, or _Blocked by robots.txt_.
7. Optional: import the site into Bing Webmaster Tools from Search Console.

## 7. Known limitations / backend suggestions

- `/products` returns one row per year/state/port, so the build pages through all rows to list unique products. A distinct-products endpoint
  (`/products/summary?countryId=&categoryId=&page=&pageSize=` returning `{ items, totalCount }`) would make the build and the UI pagination far cheaper.
- `lastmod` in the sitemap comes from the rows' `createdAt`. It is only useful if that field really changes when data changes.
- Country backdrop photos are served from `public/countries/` and selected by normalized country name. Countries without a matching local image use the plain backdrop.
- Country pages show the first page of products; all product URLs are discoverable through the sitemap, and every product page links to its siblings.
- Not verified here: behaviour against your real backend and live domain, and anything in Search Console. Run `npm run build` against production data and `npm run seo:audit` before launch.
