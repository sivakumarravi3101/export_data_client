import { LANDMARK_ARTICLES } from '@/data/countryLandmarks'

export interface LandmarkImage { url: string; title: string; pageUrl: string }

interface WikiResponse { query?: { pages?: Record<string, { thumbnail?: { source: string } }> } }
const memory = new Map<string, Promise<LandmarkImage | null>>()

async function fetchLandmark(title: string, width: number): Promise<LandmarkImage | null> {
  const key = `landmark:${width}:${title}`
  try { const hit = sessionStorage.getItem(key); if (hit) return JSON.parse(hit) as LandmarkImage } catch { /* storage unavailable */ }
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=${width}&titles=${encodeURIComponent(title)}`
  const res = await fetch(api, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = (await res.json()) as WikiResponse
  const src = Object.values(data.query?.pages ?? {})[0]?.thumbnail?.source
  if (!src) return null
  const image: LandmarkImage = { url: src, title, pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` }
  try { sessionStorage.setItem(key, JSON.stringify(image)) } catch { /* ignore */ }
  return image
}

/** One lookup per country per session; failures are not cached so a later visit can retry. */
export function getLandmarkImage(country: string, width = 1600): Promise<LandmarkImage | null> {
  const title = LANDMARK_ARTICLES[country.trim().toLowerCase()]
  if (!title) return Promise.resolve(null)
  let p = memory.get(title)
  if (!p) {
    p = fetchLandmark(title, width).catch(() => null)
    memory.set(title, p)
    void p.then(v => { if (!v) memory.delete(title) })
  }
  return p
}
