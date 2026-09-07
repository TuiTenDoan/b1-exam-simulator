import { describe, it, expect } from 'vitest'
import {
  normalise,
  isCorrect,
  choicesFor,
  taskQuestionCount,
  tickIsCorrect,
  scoreBoard,
  type PrepareGroup,
  type PrepareTask,
} from './prepareMark'

const gap = (answers: string[], accepts?: string[][]): PrepareGroup => ({
  type: 'gap',
  answers,
  accepts,
})

describe('normalise', () => {
  it('ignores case, padding and repeated spaces', () => {
    expect(normalise('  Washing   Machine ')).toBe('washing machine')
  })

  it('treats a hyphen as a space, so air-conditioning is not a wrong answer', () => {
    expect(normalise('air-conditioning')).toBe('air conditioning')
  })

  it('drops a leading pound sign, which the sheets print outside the gap', () => {
    expect(normalise('£4.50')).toBe('4.50')
  })
})

describe('isCorrect', () => {
  it('never credits a blank answer', () => {
    expect(isCorrect(gap(['fridge']), 0, '')).toBe(false)
    expect(isCorrect(gap(['fridge']), 0, '   ')).toBe(false)
    expect(isCorrect({ type: 'mcq3', answers: ['B'] }, 0, '')).toBe(false)
  })

  it('accepts a gap answer typed in any case', () => {
    expect(isCorrect(gap(['fridge']), 0, 'Fridge')).toBe(true)
  })

  it('accepts the alternative spellings listed for a gap', () => {
    expect(isCorrect(gap(['lights'], [['light']]), 0, 'light')).toBe(true)
    expect(isCorrect(gap(['lights'], [['light']]), 0, 'lamp')).toBe(false)
  })

  it('matches a choice exactly, so B is not C', () => {
    const g: PrepareGroup = { type: 'mcq3', answers: ['B', 'C'] }
    expect(isCorrect(g, 0, 'B')).toBe(true)
    expect(isCorrect(g, 1, 'B')).toBe(false)
  })

  it('marks a pick group against its own vocabulary, not A/B/C', () => {
    const g: PrepareGroup = { type: 'pick', options: ['T', 'F'], answers: ['T', 'F'] }
    expect(isCorrect(g, 0, 'T')).toBe(true)
    expect(isCorrect(g, 1, 'T')).toBe(false)
  })
})

describe('choicesFor', () => {
  it('gives every question the same options when the group shares them', () => {
    const g: PrepareGroup = { type: 'pick', options: ['O', 'C', 'M'], answers: ['O', 'C'] }
    expect(choicesFor(g, 0).map((c) => c.key)).toEqual(['O', 'C', 'M'])
    expect(choicesFor(g, 1).map((c) => c.key)).toEqual(['O', 'C', 'M'])
  })

  it('shows the friendly label but keeps the stored key', () => {
    const g: PrepareGroup = {
      type: 'pick',
      options: ['T', 'F'],
      labels: ['True', 'False'],
      answers: ['T'],
    }
    expect(choicesFor(g, 0)).toEqual([
      { key: 'T', label: 'True' },
      { key: 'F', label: 'False' },
    ])
  })

  it('gives each question its own pair when the exercise varies per line', () => {
    const g: PrepareGroup = {
      type: 'pick',
      rows: [
        ['polite', 'careless'],
        ['funny', 'polite'],
      ],
      answers: ['polite', 'funny'],
    }
    expect(choicesFor(g, 1).map((c) => c.key)).toEqual(['funny', 'polite'])
  })
})

describe('scoreBoard', () => {
  const task: PrepareTask = {
    id: 't',
    images: ['t'],
    part: 'Part 1',
    title: 'Thử',
    vi: 'Thử',
    groups: [gap(['fridge', 'roof']), { type: 'mcq3', from: 3, answers: ['B'] }],
  }

  it('counts every question, answered or not', () => {
    expect(scoreBoard([task], {}).total).toBe(3)
    expect(scoreBoard([task], {}).correct).toBe(0)
  })

  it('keys answers by the printed question number, not the array index', () => {
    // The mcq starts at 3, so the answer must be stored under 3.
    expect(scoreBoard([task], { 't.1.3': 'B' }).correct).toBe(1)
    expect(scoreBoard([task], { 't.1.1': 'B' }).correct).toBe(0)
  })

  it('marks gaps and choices together', () => {
    const given = { 't.0.1': 'Fridge', 't.0.2': 'wall', 't.1.3': 'B' }
    expect(scoreBoard([task], given)).toEqual({ total: 3, correct: 2 })
  })

  it('counts a tick exercise as a single mark', () => {
    const ticks: PrepareTask = {
      id: 'k',
      images: ['k'],
      part: 'Part 1',
      title: 'Thử',
      vi: 'Thử',
      groups: [{ type: 'tick', options: ['a', 'b', 'c'], answers: ['a', 'c'] }],
    }
    expect(taskQuestionCount(ticks)).toBe(1)
    expect(scoreBoard([ticks], { 'k.0.a': 'on', 'k.0.c': 'on' })).toEqual({
      total: 1,
      correct: 1,
    })
  })

  it('does not hand out the tick mark to someone who ticked nothing', () => {
    const group: PrepareGroup = { type: 'tick', options: ['a', 'b'], answers: [] }
    expect(tickIsCorrect('k', 0, group, {})).toBe(false)
  })
})
