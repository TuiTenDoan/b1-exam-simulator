import { describe, it, expect } from 'vitest'
import { createSession, answer, goTo, next, prev, toggleFlag } from './examSession'

const ids = ['q1', 'q2', 'q3']

describe('exam session', () => {
  it('starts on the first question with nothing answered', () => {
    const s = createSession(ids)

    expect(s.index).toBe(0)
    expect(s.answers).toEqual({})
    expect(s.answeredCount).toBe(0)
  })

  it('records an answer without moving the cursor', () => {
    const s = answer(createSession(ids), 'q1', 'B')

    expect(s.answers).toEqual({ q1: 'B' })
    expect(s.answeredCount).toBe(1)
    expect(s.index).toBe(0)
  })

  it('replaces an existing answer rather than counting it twice', () => {
    const s = answer(answer(createSession(ids), 'q1', 'B'), 'q1', 'C')

    expect(s.answers).toEqual({ q1: 'C' })
    expect(s.answeredCount).toBe(1)
  })

  it('flags a question for review and clears it again', () => {
    const flagged = toggleFlag(createSession(ids), 'q2')

    expect(flagged.flags).toEqual(['q2'])
    expect(toggleFlag(flagged, 'q2').flags).toEqual([])
  })

  it('keeps a flag independent of whether the question is answered', () => {
    const s = answer(toggleFlag(createSession(ids), 'q1'), 'q1', 'B')

    expect(s.flags).toEqual(['q1'])
    expect(s.answers).toEqual({ q1: 'B' })
  })

  it('clamps navigation at both ends instead of running off the paper', () => {
    const start = createSession(ids)

    expect(prev(start).index).toBe(0)
    expect(next(next(next(next(start)))).index).toBe(2)
    expect(goTo(start, 99).index).toBe(2)
    expect(goTo(start, -4).index).toBe(0)
  })
})
