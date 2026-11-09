import * as THREE from "three"

export interface LatLng { lat: number; lng: number }
export const INDIA: LatLng = { lat: 20.5937, lng: 78.9629 }
const D2R = Math.PI / 180

/** Single source of truth for lat/lng -> globe space (dots, markers, routes all use this). */
export function latLngToVector3({ lat, lng }: LatLng, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * D2R
  const theta = (lng + 180) * D2R
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/** Great-circle points via slerp, lifted into a smooth arc (zero lift at both ends). */
export function greatCirclePoints(a: LatLng, b: LatLng, segments = 128, base = 1.006): THREE.Vector3[] {
  const va = latLngToVector3(a)
  const vb = latLngToVector3(b)
  const omega = va.angleTo(vb)
  const sin = Math.sin(omega)
  const lift = 0.03 + 0.2 * (omega / Math.PI)
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const p = sin < 1e-6
      ? va.clone()
      : va.clone().multiplyScalar(Math.sin((1 - t) * omega) / sin).addScaledVector(vb, Math.sin(t * omega) / sin)
    return p.normalize().multiplyScalar(base + Math.sin(Math.PI * t) * lift)
  })
}

/** Euler rotation (x, y) that turns the globe so direction `v` faces the camera (+z). */
export function facingRotation(v: THREE.Vector3): { x: number; y: number } {
  return { y: Math.atan2(-v.x, v.z), x: Math.atan2(v.y, Math.hypot(v.x, v.z)) }
}
