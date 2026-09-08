import { describe, it, expect } from 'vitest'
import { mark } from './format'

describe('mark', () => {
  it('writes the decimal separator the Vietnamese way', () => {
    expect(mark(3.5)).toBe('3,5')
    expect(mark(10)).toBe('10,0')
    expect(mark(0)).toBe('0,0')
  })

  it('rounds to the requested number of digits', () => {
    expect(mark(6.849, 2)).toBe('6,85')
    expect(mark(6.849, 0)).toBe('7')
  })

  it('shows a dash rather than NaN when there is nothing to show', () => {
    expect(mark(Number.NaN)).toBe('—')
    expect(mark(Number.POSITIVE_INFINITY)).toBe('—')
  })
})
