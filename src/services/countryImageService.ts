import { COUNTRY_BACKGROUND_FILES } from '@/data/countryLandmarks'

export interface LandmarkImage { url: string }

/** Resolve only images that exist locally; countries without an asset use the plain backdrop. */
export function getLandmarkImage(country: string): LandmarkImage | null {
  const key = country.trim().toLowerCase().replace(/[^a-z]/g, '')
  const file = COUNTRY_BACKGROUND_FILES[key]
  return file ? { url: `/countries/${file}` } : null
}
