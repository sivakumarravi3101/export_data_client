import { computed, type Ref } from 'vue'
import { getLandmarkImage } from '@/services/countryImageService'

export function useCountryImage(countryName: Ref<string>) {
  const image = computed(() => getLandmarkImage(countryName.value))
  return { image }
}
