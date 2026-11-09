import { ref, watch, type Ref } from 'vue'
import { getLandmarkImage, type LandmarkImage } from '@/services/countryImageService'

export function useCountryImage(countryName: Ref<string>) {
  const image = ref<LandmarkImage | null>(null)
  const loaded = ref(false)
  watch(countryName, async name => {
    image.value = null; loaded.value = false
    const found = await getLandmarkImage(name)
    if (!found || countryName.value !== name) return
    const img = new Image() // preload so the backdrop fades in instead of popping
    img.onload = () => { if (countryName.value === name) { image.value = found; loaded.value = true } }
    img.src = found.url
  }, { immediate: true })
  return { image, loaded }
}
