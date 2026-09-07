import { describe, it, expect } from 'vitest'
import listening from '../data/prepare.json'
import reading from '../data/prepareReading.json'
import { answerKey, choicesFor, taskQuestionCount, type PrepareBoard } from './prepareMark'

/**
 * These boards are answer keys for the user's own textbook, and several were
 * worked out by reading the page rather than copied from a printed key. A typo
 * here would teach the wrong answer with no visible symptom, so the shape of
 * every key is checked against the choices the screen actually offers.
 */
const boards: [string, PrepareBoard][] = [
  ['listening', listening as unknown as PrepareBoard],
  ['reading', reading as unknown as PrepareBoard],
]

describe.each(boards)('%s board', (_name, board) => {
  it('gives every task a unique id', () => {
    const ids = board.tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every task at least one sheet image', () => {
    for (const t of board.tasks) {
      expect(t.images.length, t.id).toBeGreaterThan(0)
    }
  })

  it('offers every correct answer as one of that question’s own choices', () => {
    for (const t of board.tasks) {
      t.groups.forEach((g, gi) => {
        if (g.type === 'gap' || g.type === 'tick') return
        g.answers.forEach((answer, i) => {
          const keys =
            g.type === 'mcq3'
              ? ['A', 'B', 'C']
              : g.type === 'rw'
                ? ['R', 'W']
                : choicesFor(g, i).map((c) => c.key)
          expect(keys, `${t.id} group ${gi} question ${i + 1}`).toContain(answer)
        })
      })
    }
  })

  it('never lets two questions share one answer slot', () => {
    // A sheet may hold two exercises that both start numbering at 1 — the
    // group index is what keeps their answers apart, so that is what is
    // checked here rather than the printed numbers.
    for (const t of board.tasks) {
      const keys: string[] = []
      t.groups.forEach((g, gi) => {
        if (g.type === 'tick') {
          ;(g.options ?? []).forEach((opt) => keys.push(answerKey(t.id, gi, opt)))
          return
        }
        const from = g.from ?? 1
        g.answers.forEach((_, i) => keys.push(answerKey(t.id, gi, from + i)))
      })
      expect(new Set(keys).size, t.id).toBe(keys.length)
    }
  })

  it('lists one accepts entry per gap when alternatives are given', () => {
    for (const t of board.tasks) {
      for (const g of t.groups) {
        if (g.accepts) expect(g.accepts.length, t.id).toBe(g.answers.length)
      }
    }
  })

  it('names a folder for its sheet images', () => {
    expect(board.imageDir).toMatch(/^prepare\//)
  })
})

describe('reading board', () => {
  const board = reading as unknown as PrepareBoard

  it('holds the 12 exercises that have a usable answer key', () => {
    expect(board.tasks.length).toBe(12)
    expect(board.tasks.reduce((n, t) => n + taskQuestionCount(t), 0)).toBe(87)
  })

  it('says of every task whether the key is the document’s or was derived', () => {
    for (const t of board.tasks) {
      expect(['doc', 'derived'], t.id).toContain(t.origin)
    }
  })

  it('leaves out the two gap-fills whose passage the document never printed', () => {
    // p42_0 and p43_0 are option lists with no text to read; answering them
    // would mean inventing a key.
    const images = board.tasks.flatMap((t) => t.images)
    expect(images).not.toContain('p42_0')
    expect(images).not.toContain('p43_0')
  })

  it('has no recordings to play', () => {
    expect(board.audioDir).toBeUndefined()
    for (const t of board.tasks) expect(t.audio, t.id).toBeUndefined()
  })
})

describe('listening board', () => {
  const board = listening as unknown as PrepareBoard

  it('still points every task at a recording after the images migration', () => {
    expect(board.audioDir).toBe('prepare/audio')
    for (const t of board.tasks) expect(typeof t.audio, t.id).toBe('string')
  })
})
