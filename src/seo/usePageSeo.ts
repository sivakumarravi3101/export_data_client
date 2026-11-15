import { useHead } from '@unhead/vue'
import { absoluteUrl, SITE_INDEXABLE, SITE_NAME } from '@/seo/config'

export interface PageSeo {
  title: string
  description: string
  /** Canonical path (no query string, no trailing slash). */
  path: string
  noindex?: boolean
  image?: string | null
  /** Append " | Site name" when it fits in ~62 characters (default true). */
  brand?: boolean
  jsonLd?: object[]
}

const ld = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c') // keeps "</script>" out of the payload

/** One call per view; pass a getter so title/description follow reactive data. */
export function usePageSeo(source: () => PageSeo) {
  useHead(() => {
    const s = source()
    const url = absoluteUrl(s.path)
    const title = s.brand === false || s.title.length + SITE_NAME.length + 3 > 62 ? s.title : `${s.title} | ${SITE_NAME}`
    const image = s.image ?? absoluteUrl('/og-default.png')
    const robots = !SITE_INDEXABLE ? 'noindex, nofollow' : s.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'
    return {
      title,
      link: [{ rel: 'canonical', href: url }],
      meta: [
        { name: 'description', content: s.description },
        { name: 'robots', content: robots },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_IN' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: s.description },
        { property: 'og:url', content: url },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: s.description },
        { property: 'og:image', content: image },
        { name: 'twitter:image', content: image },
      ],
      script: (s.jsonLd ?? []).map((j, i) => ({ key: `ld-${i}`, type: 'application/ld+json', innerHTML: ld(j) })),
    }
  })
}
