import { describe, it, expect } from 'vitest'
import { productPageTitle, shorten, titleCase } from '@/seo/text'

describe('productPageTitle', () => {
  it('uses the most descriptive form that fits', () => {
    expect(productPageTitle('Tomato Seeds', 'Japan', '12099160')).toBe('Tomato Seeds Exports from India to Japan (HS 12099160)')
    expect(productPageTitle('Fresh Mangoes and Pulp', 'United Kingdom', '08045020')).toBe('Fresh Mangoes and Pulp Exports to United Kingdom (HS 08045020)')
  })
  it('keeps country and HS code and stays unique for long names (regression: UAE/UK/US shared one title)', () => {
    const name = titleCase('LIQUERS IN CONTAINERS HOLDING 2 LTR OR LESS')
    const titles = ['United Arab Emirates', 'United Kingdom', 'United States'].map(c => productPageTitle(name, c, '22087011'))
    expect(new Set(titles).size).toBe(3)
    for (const [i, c] of ['United Arab Emirates', 'United Kingdom', 'United States'].entries()) {
      expect(titles[i]).toContain(c); expect(titles[i]).toContain('HS 22087011'); expect(titles[i]!.length).toBeLessThanOrEqual(62)
    }
  })
  it('different products in one country stay distinct even when their names share a long prefix', () => {
    const a = productPageTitle('Frozen Fish Fillets Of Hake Dried Salted', 'United Arab Emirates', '03049100')
    const b = productPageTitle('Frozen Fish Fillets Of Hake Dried Salted', 'United Arab Emirates', '03049200')
    expect(a).not.toBe(b)
  })
  it('shorten cuts on a word boundary', () => { expect(shorten('Alpha Beta Gamma Delta', 14)).toBe('Alpha Beta…'); expect(shorten('Short', 14)).toBe('Short') })
})
