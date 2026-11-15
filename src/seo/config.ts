const env = import.meta.env

/** Public origin of the deployed site, no trailing slash. Required for canonical URLs and the sitemap. */
export const SITE_URL: string = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
export const SITE_NAME: string = env.VITE_SITE_NAME ?? 'India Export Data'
/** Only the real production deployment should set VITE_SITE_INDEXABLE=true. Everything else is noindex. */
export const SITE_INDEXABLE: boolean = env.VITE_SITE_INDEXABLE === 'true'

export function absoluteUrl(path: string): string {
  const origin = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const clean = path === '/' ? '/' : path.replace(/\/+$/, '')
  return `${origin}${clean}`
}
