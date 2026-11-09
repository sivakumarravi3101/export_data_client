import * as THREE from "three"

/** Simple low-poly airliner. Nose points to +Z, wings along X, up is +Y. */
export function createAirplane(): { group: THREE.Group; dispose: () => void } {
  const body = new THREE.MeshBasicMaterial({ color: 0xf2f8ff })
  const accent = new THREE.MeshBasicMaterial({ color: 0x35f08c })
  const geos = {
    fuselage: new THREE.CapsuleGeometry(0.15, 1.1, 4, 10),
    wing: new THREE.BoxGeometry(0.95, 0.04, 0.36),
    tail: new THREE.BoxGeometry(0.42, 0.03, 0.2),
    fin: new THREE.BoxGeometry(0.03, 0.32, 0.24),
  }
  const group = new THREE.Group()
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, fn: (m: THREE.Mesh) => void) => {
    const m = new THREE.Mesh(geo, mat); fn(m); group.add(m)
  }
  add(geos.fuselage, body, m => { m.rotation.x = Math.PI / 2 })
  add(geos.wing, body, m => { m.position.set(-0.45, 0, -0.05); m.rotation.y = -0.42 })
  add(geos.wing, body, m => { m.position.set(0.45, 0, -0.05); m.rotation.y = 0.42 })
  add(geos.tail, body, m => { m.position.set(-0.2, 0, -0.62); m.rotation.y = -0.3 })
  add(geos.tail, body, m => { m.position.set(0.2, 0, -0.62); m.rotation.y = 0.3 })
  add(geos.fin, accent, m => { m.position.set(0, 0.17, -0.6) })
  return {
    group,
    dispose: () => { body.dispose(); accent.dispose(); Object.values(geos).forEach(g => g.dispose()) },
  }
}
