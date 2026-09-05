import { describe, it, expect } from 'vitest'
import { remainingAt, phaseFor, formatClock } from './timer'

const startedAt = 1_000_000

describe('exam timer', () => {
  it('counts down from the allowance and never goes negative', () => {
    expect(remainingAt(startedAt, 600, startedAt)).toBe(600)
    expect(remainingAt(startedAt, 600, startedAt + 90_000)).toBe(510)
    expect(remainingAt(startedAt, 600, startedAt + 999_000)).toBe(0)
  })

  it('escalates through the warning phases as time runs out', () => {
    expect(phaseFor(600)).toBe('normal')
    expect(phaseFor(300)).toBe('warning')
    expect(phaseFor(60)).toBe('critical')
    expect(phaseFor(0)).toBe('expired')
  })

  it('formats the clock with a padded two-digit seconds field', () => {
    expect(formatClock(600)).toBe('10:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(9)).toBe('00:09')
  })
})
