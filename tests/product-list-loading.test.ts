import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import ProductList from '@/components/ProductList.vue'

describe('product list loading state', () => {
  it('renders six card-shaped shimmer placeholders while loading', async () => {
    const html = await renderToString(createSSRApp(ProductList, {
      products: [],
      loading: true,
      error: null,
      selectedHs: null,
      filtered: false,
      toProduct: () => '/',
    }))

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Loading products"')
    expect((html.match(/class="lg-card product-skeleton"/g) ?? [])).toHaveLength(6)
  })
})
