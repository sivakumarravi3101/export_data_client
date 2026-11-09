import type { LatLng } from "@/lib/geo"

// Country centroids (lat, lng). Backend only returns id + name, so we map by name.
const COORDS: Record<string, LatLng> = {
  "australia": { lat: -25.27, lng: 133.78 },
  "canada": { lat: 56.13, lng: -106.35 },
  "china": { lat: 35.86, lng: 104.2 },
  "egypt": { lat: 26.82, lng: 30.8 },
  "germany": { lat: 51.17, lng: 10.45 },
  "japan": { lat: 36.2, lng: 138.25 },
  "kuwait": { lat: 29.31, lng: 47.48 },
  "malaysia": { lat: 4.21, lng: 101.98 },
  "qatar": { lat: 25.35, lng: 51.18 },
  "united arab emirates": { lat: 23.42, lng: 53.85 },
  "united kingdom": { lat: 55.38, lng: -3.44 },
  "united states": { lat: 37.09, lng: -95.71 },
  // likely future destinations
  "france": { lat: 46.23, lng: 2.21 },
  "singapore": { lat: 1.35, lng: 103.82 },
  "saudi arabia": { lat: 23.89, lng: 45.08 },
  "bangladesh": { lat: 23.68, lng: 90.36 },
  "nepal": { lat: 28.39, lng: 84.12 },
  "sri lanka": { lat: 7.87, lng: 80.77 },
  "netherlands": { lat: 52.13, lng: 5.29 },
  "south africa": { lat: -30.56, lng: 22.94 },
}

export function getCountryCoordinates(name: string): LatLng | null {
  return COORDS[name.trim().toLowerCase()] ?? null
}
