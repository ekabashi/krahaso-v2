import { describe, it, expect } from 'vitest'
import { useFormatPrice } from '../../../layers/shared/app/composables/useFormatPrice'

describe('useFormatPrice', () => {
  it('formatPrice returns string with EUR and number', () => {
    const { formatPrice } = useFormatPrice()
    const result = formatPrice(1234)
    expect(typeof result).toBe('string')
    expect(result).toContain('€')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('formatPrice(0) contains 0 and currency', () => {
    const { formatPrice } = useFormatPrice()
    const result = formatPrice(0)
    expect(result).toContain('€')
    expect(result).toContain('0')
  })
})
