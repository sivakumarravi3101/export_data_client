import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLandmarkImage } from '@/services/countryImageService'

describe('country background images', () => {
  it('resolves country names to existing local image files', () => {
    for (const country of ['Australia', 'China', 'Germany', 'United Arab Emirates']) {
      const image = getLandmarkImage(country)
      expect(image).not.toBeNull()
      expect(existsSync(resolve(process.cwd(), 'public', image!.url.slice(1)))).toBe(true)
    }
  })

  it('returns no background for countries without a local image', () => {
    expect(getLandmarkImage('France')).toBeNull()
  })
})
