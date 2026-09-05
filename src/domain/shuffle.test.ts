import { describe, it, expect } from 'vitest'
import { makeRng, shuffleOptions, shuffleWithinGroups } from './shuffle'
import type { ShufflableQuestion } from './shuffle'

const mcq: ShufflableQuestion = {
  id: 'q1',
  kind: 'mcq',
  correct: 'B',
  options: [
    { key: 'A', text: 'comes' },
    { key: 'B', text: 'is coming' },
    { key: 'C', text: 'came' },
    { key: 'D', text: 'come' },
  ],
}

describe('shuffleOptions', () => {
  it('keeps the correct answer pointing at the same text after reordering', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const out = shuffleOptions(mcq, makeRng(seed))
      const correctText = out.options.find((o) => o.key === out.correct)?.text
      expect(correctText).toBe('is coming')
    }
  })

  it('keeps every original option exactly once, relabelled A onwards', () => {
    const out = shuffleOptions(mcq, makeRng(7))

    expect(out.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    expect(out.options.map((o) => o.text).sort()).toEqual(
      ['came', 'come', 'comes', 'is coming'],
    )
  })

  it('leaves RIGHT/WRONG and gap-fill questions untouched', () => {
    const rw: ShufflableQuestion = {
      id: 'q2',
      kind: 'rightwrong',
      correct: 'A',
      options: [
        { key: 'A', text: 'RIGHT' },
        { key: 'B', text: 'WRONG' },
      ],
    }
    const gap: ShufflableQuestion = { id: 'q3', kind: 'gap', correct: 'library', options: [] }

    expect(shuffleOptions(rw, makeRng(3))).toEqual(rw)
    expect(shuffleOptions(gap, makeRng(3))).toEqual(gap)
  })

  it('is deterministic for a given seed', () => {
    const a = shuffleOptions(mcq, makeRng(42))
    const b = shuffleOptions(mcq, makeRng(42))
    expect(a).toEqual(b)
  })
})

describe('shuffleWithinGroups', () => {
  const items = [
    { id: 'a1', g: 'P1' },
    { id: 'a2', g: 'P1' },
    { id: 'a3', g: 'P1' },
    { id: 'b1', g: 'P2' },
    { id: 'b2', g: 'P2' },
  ]

  it('never moves a question out of its group', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = shuffleWithinGroups(items, (i) => i.g, makeRng(seed))
      expect(out.map((i) => i.g)).toEqual(['P1', 'P1', 'P1', 'P2', 'P2'])
      expect(out.map((i) => i.id).sort()).toEqual(['a1', 'a2', 'a3', 'b1', 'b2'])
    }
  })

  it('does reorder within a group across seeds', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, s) =>
        shuffleWithinGroups(items, (i) => i.g, makeRng(s + 1))
          .map((i) => i.id)
          .join(','),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })
})
