import { createMemoryHistory, createRouter, createWebHistory, type NavigationGuard, type RouteLocationNormalized } from 'vue-router'
import { countryIndexFor } from '@/lib/countryIndex'
import { parseProductKey } from '@/lib/slug'
import { getCountries } from '@/services/marketInsightService'

const CountryView = () => import('@/views/CountryView.vue') // one loader => country and product routes share the component

const notFound = (to: RouteLocationNormalized) => ({
  name: 'not-found',
  params: { pathMatch: to.path.split('/').slice(1) },
  query: to.query,
  hash: to.hash,
  replace: true,
})

/**
 * Resolves the country slug before the page renders (list is cached / preloaded, so this is instant after the first load):
 *  - /country/12            -> 301-style client redirect to /country/<slug>   (old numeric URLs)
 *  - unknown slug / bad key -> not-found page (noindex) instead of redirecting to "/" (which crawlers treat as a soft 404)
 */
const resolveCountry: NavigationGuard = async to => {
  if (to.name !== 'country' && to.name !== 'product' && to.name !== 'country-legacy') return
  let list
  try { list = await getCountries() } catch { return } // API down: the view shows its own error state
  const index = countryIndexFor(list)
  if (to.name === 'country-legacy') {
    const slug = index.slugById.get(Number(to.params.countryId))
    return slug ? { name: 'country', params: { countrySlug: slug }, replace: true } : notFound(to)
  }
  if (!index.bySlug.has(String(to.params.countrySlug))) return notFound(to)
  if (to.name === 'product' && !parseProductKey(String(to.params.productKey))) return notFound(to)
}

export function createAppRouter(server = false) {
  const router = createRouter({
    history: server ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes: [
      { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: '/country/:countryId(\\d+)', name: 'country-legacy', component: CountryView, meta: { page: 'country' } },
      { path: '/country/:countrySlug', name: 'country', component: CountryView, meta: { page: 'country' } },
      { path: '/country/:countrySlug/product/:productKey', name: 'product', component: CountryView, meta: { page: 'country' } },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
    ],
    scrollBehavior(to, from, saved) {
      if (saved) return saved
      if (to.meta.page === 'country' && from.meta.page === 'country') return false // picking a product keeps the scroll position
      return { top: 0 }
    },
  })
  router.beforeEach(resolveCountry)
  return router
}
