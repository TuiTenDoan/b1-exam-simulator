import { describe, it, expect } from 'vitest'
import { gradeSection } from './scoring'
import type { AnswerKeyEntry } from './types'

const mcq: AnswerKeyEntry[] = [
  { id: 'q1', correct: 'A' },
  { id: 'q2', correct: 'C' },
]

describe('gradeSection', () => {
  it('counts correct answers and reports the 10-point score', () => {
    const result = gradeSection(mcq, { q1: 'A', q2: 'C' })

    expect(result.correct).toBe(2)
    expect(result.total).toBe(2)
    expect(result.score10).toBe(10)
  })

  it('accepts gap-fill answers regardless of case, padding or listed variants', () => {
    const gaps: AnswerKeyEntry[] = [
      { id: 'g1', correct: 'library' },
      { id: 'g2', correct: 'half past ten', accepts: ['10:30', 'ten thirty'] },
    ]

    const result = gradeSection(gaps, { g1: '  LiBrArY ', g2: '10:30' })

    expect(result.questions[0].isCorrect).toBe(true)
    expect(result.questions[1].isCorrect).toBe(true)
    expect(result.score10).toBe(10)
  })

  it('rounds the score to two decimals instead of leaking float drift', () => {
    // 17 of 25 is 6.8, but 17 / 25 * 10 evaluates to 6.800000000000001.
    const key: AnswerKeyEntry[] = Array.from({ length: 25 }, (_, i) => ({
      id: `q${i}`,
      correct: 'A',
    }))
    const answers = Object.fromEntries(
      key.map((entry, i) => [entry.id, i < 17 ? 'A' : 'B']),
    )

    expect(gradeSection(key, answers).score10).toBe(6.8)
  })

  it('marks a section passed only at or above 5.0 out of 10', () => {
    const key: AnswerKeyEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`,
      correct: 'A',
    }))
    const answerFirst = (n: number) =>
      Object.fromEntries(key.map((e, i) => [e.id, i < n ? 'A' : 'B']))

    expect(gradeSection(key, answerFirst(4)).passed).toBe(false)
    expect(gradeSection(key, answerFirst(5)).passed).toBe(true)
  })
})
