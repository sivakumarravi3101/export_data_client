import * as THREE from "three"
import { INDIA, type LatLng, latLngToVector3, greatCirclePoints, facingRotation } from "@/lib/geo"
import { createAirplane } from "./airplane"

export interface GlobeDestination { id: number; name: string; coords: LatLng }

// Equirectangular mask: land = dark, ocean = bright (three.js earth_specular map).
const MASK_URL = "/textures/earth-mask.jpg"
const LAUNCH = 0.3, FLIGHT = 2.5, ARRIVE = 0.25 // seconds
const REST_TILT = 0.3
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Journey {
  start: number
  curve: THREE.CatmullRomCurve3
  route: THREE.Group
  progress: { value: number }
  plane: ReturnType<typeof createAirplane>
  resolve: () => void
  done: boolean
}

export class GlobeScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  private globe = new THREE.Group()
  private stars!: THREE.Points
  private clock = new THREE.Clock()
  private ro: ResizeObserver
  private raf = 0
  private disposed = false
  private owned: { dispose(): void }[] = []

  private markers = new Map<number, THREE.Mesh>()
  private markerGeo = this.own(new THREE.SphereGeometry(1, 14, 14))
  private mats = {
    core: this.own(new THREE.MeshBasicMaterial({ color: 0x9be7ff })),
    halo: this.own(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })),
    selCore: this.own(new THREE.MeshBasicMaterial({ color: 0x7dffb6 })),
    selHalo: this.own(new THREE.MeshBasicMaterial({ color: 0x35f08c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })),
    india: this.own(new THREE.MeshBasicMaterial({ color: 0xffc766 })),
    indiaHalo: this.own(new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })),
  }
  private pulse: THREE.Mesh
  private selectedId: number | null = null

  private baseZ = 4.5
  private camTargetZ = 4.5
  private focus: { x: number; y: number } | null = null
  private autoRotate = true
  private journey: Journey | null = null
  private m4 = new THREE.Matrix4()
  private v1 = new THREE.Vector3()
  private v2 = new THREE.Vector3()
  private v3 = new THREE.Vector3()

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.domElement.style.display = "block"
    container.appendChild(this.renderer.domElement)

    this.scene.add(this.globe)
    this.buildOcean()
    this.buildAtmosphere()
    this.buildStars()
    this.makeMarker(INDIA, this.mats.india, this.mats.indiaHalo, 0.018, 3.2)
    this.pulse = this.buildPulse()
    this.globe.rotation.set(REST_TILT, facingRotation(latLngToVector3(INDIA)).y, 0)
    this.camera.position.z = this.baseZ

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
    this.camera.position.z = this.camTargetZ
    void this.buildLand()
    this.tick()
  }

  private own<T extends { dispose(): void }>(o: T): T { this.owned.push(o); return o }

  /* ---------- static scenery ---------- */
  private buildOcean() {
    this.globe.add(new THREE.Mesh(
      this.own(new THREE.SphereGeometry(0.998, 64, 64)),
      this.own(new THREE.MeshBasicMaterial({ color: 0x050d1f })),
    ))
  }

  private buildAtmosphere() {
    const mat = this.own(new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 3.0); gl_FragColor = vec4(0.12, 0.55, 1.0, i); }`,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }))
    this.scene.add(new THREE.Mesh(this.own(new THREE.SphereGeometry(0.8, 64, 64)), mat))
  }

  private buildStars() {
    const n = 1600
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 12 + Math.random() * 18
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u)
      pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3)
    }
    const geo = this.own(new THREE.BufferGeometry())
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(geo, this.own(new THREE.PointsMaterial({ color: 0x8fb8ff, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false })))
    this.scene.add(this.stars)
  }

  /** Thousands of glowing dots, kept only where the mask says "land". */
  private async buildLand(count = 26000) {
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.crossOrigin = "anonymous"
        i.onload = () => res(i); i.onerror = () => rej(new Error(`Could not load ${MASK_URL}`)); i.src = MASK_URL
      })
      const w = 1024, h = 512
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data
      const golden = Math.PI * (3 - Math.sqrt(5))
      const pos: number[] = []
      for (let i = 0; i < count; i++) {
        const lat = Math.asin(1 - (2 * (i + 0.5)) / count) * (180 / Math.PI)
        const lng = ((i * golden * (180 / Math.PI)) % 360) - 180
        const px = Math.min(w - 1, Math.floor(((lng + 180) / 360) * w))
        const py = Math.min(h - 1, Math.floor(((90 - lat) / 180) * h))
        if (data[(py * w + px) * 4]! < 110) {
          const v = latLngToVector3({ lat, lng }, 1.002)
          pos.push(v.x, v.y, v.z)
        }
      }
      if (this.disposed) return
      const geo = this.own(new THREE.BufferGeometry())
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
      const mat = this.own(new THREE.PointsMaterial({ color: 0x5ad1ff, size: 0.011, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))
      this.globe.add(new THREE.Points(geo, mat))
    } catch (e) {
      console.warn("[GlobeScene] land dots unavailable:", e)
    }
  }

  /* ---------- markers ---------- */
  private makeMarker(coords: LatLng, core: THREE.Material, halo: THREE.Material, size: number, haloScale: number) {
    const m = new THREE.Mesh(this.markerGeo, core)
    m.scale.setScalar(size)
    m.position.copy(latLngToVector3(coords, 1.004))
    const h = new THREE.Mesh(this.markerGeo, halo)
    h.scale.setScalar(haloScale)
    m.add(h)
    this.globe.add(m)
    return m
  }

  setDestinations(list: GlobeDestination[]) {
    this.markers.forEach(m => this.globe.remove(m))
    this.markers.clear()
    for (const d of list) this.markers.set(d.id, this.makeMarker(d.coords, this.mats.core, this.mats.halo, 0.012, 2.6))
  }

  private buildPulse() {
    const m = new THREE.Mesh(
      this.own(new THREE.RingGeometry(0.88, 1, 48)),
      this.own(new THREE.MeshBasicMaterial({ color: 0x35f08c, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })),
    )
    m.visible = false
    this.globe.add(m)
    return m
  }

  private highlight(id: number | null) {
    if (this.selectedId !== null) this.styleMarker(this.markers.get(this.selectedId), false)
    this.selectedId = id
    if (id !== null) this.styleMarker(this.markers.get(id), true)
  }
  private styleMarker(m: THREE.Mesh | undefined, on: boolean) {
    if (!m) return
    m.material = on ? this.mats.selCore : this.mats.core
      ; (m.children[0] as THREE.Mesh).material = on ? this.mats.selHalo : this.mats.halo
    m.scale.setScalar(on ? 0.02 : 0.012)
  }

  /* ---------- journey ---------- */
  flyTo(dest: GlobeDestination): Promise<void> {
    this.clearJourney()
    this.highlight(dest.id)
    const pts = greatCirclePoints(INDIA, dest.coords)
    const curve = new THREE.CatmullRomCurve3(pts)
    const progress = { value: 0 }
    const route = new THREE.Group()
    const routeMat = (alpha: number) => new THREE.ShaderMaterial({
      uniforms: { uProgress: progress, uAlpha: { value: alpha } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uProgress; uniform float uAlpha; varying vec2 vUv;
        void main(){
          if (vUv.x > uProgress) discard;
          float k = 0.5 + 0.5 * (1.0 - clamp((uProgress - vUv.x) / 0.4, 0.0, 1.0));
          gl_FragColor = vec4(vec3(0.2, 1.0, 0.55) * k, uAlpha * k);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    route.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.004, 6, false), routeMat(1)))
    route.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.014, 8, false), routeMat(0.22)))
    this.globe.add(route)

    const plane = createAirplane()
    plane.group.scale.setScalar(0.0001)
    plane.group.position.copy(pts[0]!)
    this.globe.add(plane.group)

    const mid = pts[Math.floor(pts.length / 2)]!.clone().normalize()
    const f = facingRotation(mid)
    this.focus = { x: f.x * 0.7, y: f.y }
    this.autoRotate = false
    this.camTargetZ = this.baseZ * 0.86

    this.pulse.position.copy(latLngToVector3(dest.coords, 1.006))
    this.pulse.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), latLngToVector3(dest.coords).normalize())

    return new Promise<void>(resolve => {
      this.journey = { start: this.clock.elapsedTime, curve, route, progress, plane, resolve, done: false }
    })
  }

  private clearJourney() {
    const j = this.journey
    if (j) {
      this.globe.remove(j.route, j.plane.group)
      j.route.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
      j.plane.dispose()
      this.journey = null
    }
    this.pulse.visible = false
    this.highlight(null)
  }

  /** Return to idle: remove route, resume slow rotation. */
  reset() {
    this.clearJourney()
    this.focus = null
    this.autoRotate = true
    this.camTargetZ = this.baseZ
  }

  private updateJourney(now: number) {
    const j = this.journey
    if (!j || j.done) return
    const e = now - j.start
    const p = ease(THREE.MathUtils.clamp((e - LAUNCH) / FLIGHT, 0, 1))
    j.progress.value = p

    const pos = j.curve.getPointAt(p, this.v1)
    const tan = j.curve.getTangentAt(Math.min(p, 0.995), this.v2)
    j.plane.group.position.copy(pos)
    this.v3.copy(pos).add(tan)
    this.m4.lookAt(this.v3, pos, this.v2.copy(pos).normalize())
    j.plane.group.quaternion.setFromRotationMatrix(this.m4)

    const arrive = THREE.MathUtils.clamp((e - LAUNCH - FLIGHT) / (ARRIVE * 0.7), 0, 1)
    const s = THREE.MathUtils.clamp(e / LAUNCH, 0, 1) * (1 - arrive)
    j.plane.group.scale.setScalar(Math.max(0.0001, 0.055 * s))
    this.pulse.visible = p > 0.92

    if (e >= LAUNCH + FLIGHT + ARRIVE) { j.done = true; j.resolve() }
  }

  private updatePulse(now: number) {
    if (!this.pulse.visible) return
    const ph = (now * 0.9) % 1
    this.pulse.scale.setScalar(0.014 + ph * 0.075)
      ; (this.pulse.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.85
  }

  /* ---------- loop ---------- */
  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const a = w / h
    this.baseZ = a < 0.9 ? 6.2 : a < 1.3 ? 5 : 4.5
    this.camTargetZ = this.journey ? this.baseZ * 0.86 : this.baseZ
  }
  //movement of the globe and camera, called every frame
  private tick = () => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const now = this.clock.elapsedTime
    const k = 1 - Math.exp(-dt * 2.5)
    if (this.focus) {
      this.globe.rotation.y += wrap(this.focus.y - this.globe.rotation.y) * k
      this.globe.rotation.x += (this.focus.x - this.globe.rotation.x) * k
    } else if (this.autoRotate) {
      this.globe.rotation.y += dt * 0.08
      this.globe.rotation.x += (REST_TILT - this.globe.rotation.x) * k * 0.5
    }
    this.camera.position.z += (this.camTargetZ - this.camera.position.z) * (1 - Math.exp(-dt * 2))
    this.stars.rotation.y += dt * 0.01
    this.updateJourney(now)
    this.updatePulse(now)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.clearJourney()
    this.owned.forEach(o => o.dispose())
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
