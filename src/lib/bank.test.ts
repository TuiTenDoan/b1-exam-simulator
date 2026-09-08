import { describe, it, expect } from 'vitest'
import { buildBankPaper, BANK_SIZE } from './bank'
import { buildPaper, type RawPaper } from './paper'
import { reportPart } from './paperQuality'

/**
 * A drawn paper has no author to proof-read it, so the checks that a written
 * paper passes once have to hold for every draw. These run over many seeds:
 * one lucky seed proves nothing about the pool.
 */

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13)
const papers = SEEDS.map((s) => buildBankPaper(s))
const built = papers.map((raw) => buildPaper(raw as unknown as RawPaper))

describe('the pool', () => {
  it('holds every question the app owns, not just the new ones', () => {
    // 4 papers x 50 written by hand, plus 250 in the bank.
    expect(BANK_SIZE).toBe(450)
  })
})

describe.each([
  ['first', 0],
  ['middle', 30],
  ['last', 59],
])('a paper drawn with the %s seed', (_name, i) => {
  const paper = built[i]

  it('has fifty questions in five parts', () => {
    expect(paper.questions).toHaveLength(50)
    expect([...new Set(paper.questions.map((q) => q.partId))]).toEqual([
      'R1',
      'R2',
      'R3',
      'R4',
      'R5',
    ])
  })

  it('keeps the counts the revision document sets out', () => {
    for (const part of ['R1', 'R2', 'R3', 'R4', 'R5']) {
      expect(paper.questions.filter((q) => q.partId === part), part).toHaveLength(10)
    }
  })

  it('asks five Right/Wrong questions and five best-answer ones', () => {
    const r3 = paper.questions.filter((q) => q.partId === 'R3')
    expect(r3.filter((q) => q.kind === 'rightwrong')).toHaveLength(5)
    expect(r3.filter((q) => q.kind === 'mcq')).toHaveLength(5)
  })

  it('gives the short-text part three options and the rest four', () => {
    for (const q of paper.questions) {
      if (q.kind === 'rightwrong') continue
      expect(q.options.length, q.id).toBe(q.partId === 'R5' ? 3 : 4)
    }
  })

  it('never repeats a question inside one paper', () => {
    const ids = paper.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shows every passage that its questions refer to', () => {
    for (const q of paper.questions) {
      if (q.partId === 'R3' || q.partId === 'R4') {
        expect(q.passage?.body?.length ?? 0, q.id).toBeGreaterThan(80)
      }
    }
  })
})

describe('every drawn paper', () => {
  it('numbers the gaps 1 to 10 and matches them to the passages', () => {
    for (const raw of papers) {
      const part = (raw.parts as unknown as {
        id: string
        items: { gapNumber?: number }[]
        passages?: { body: string }[]
      }[]).find((p) => p.id === 'R4')!

      const asked = part.items.map((i) => i.gapNumber!).sort((a, b) => a - b)
      expect(asked).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

      const printed = (part.passages ?? [])
        .flatMap((p) => [...p.body.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])))
        .sort((a, b) => a - b)
      expect(printed).toEqual(asked)
    }
  })

  it('never lets "pick the longest option" beat guessing', () => {
    const bad: string[] = []
    for (const raw of papers) {
      for (const part of raw.parts as unknown as { id: string; items: never[] }[]) {
        const r = reportPart({ id: part.id, items: part.items })
        if (r && r.longestWins > r.allowedLongestWins) {
          bad.push(`${r.partId}: ${r.longestWins}/${r.scored}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('uses every answer letter in every part', () => {
    const bad: string[] = []
    for (const raw of papers) {
      for (const part of raw.parts as unknown as { id: string; items: never[] }[]) {
        const r = reportPart({ id: part.id, items: part.items })
        if (r?.unusedKeys.length) bad.push(`${r.partId}: thiếu ${r.unusedKeys.join(',')}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('keeps every answer inside its own options', () => {
    for (const paper of built) {
      for (const q of paper.questions) {
        if (q.kind === 'rightwrong') {
          expect(['A', 'B'], q.id).toContain(q.correct)
          continue
        }
        expect(q.options.map((o) => o.key), q.id).toContain(q.correct)
      }
    }
  })

  it('explains every question', () => {
    for (const paper of built) {
      for (const q of paper.questions) {
        expect((q.explain ?? '').trim().length, q.id).toBeGreaterThan(19)
      }
    }
  })
})

describe('drawing twice', () => {
  it('gives the same paper for the same seed', () => {
    const a = buildBankPaper(4242)
    const b = buildBankPaper(4242)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('gives a different paper for a different seed', () => {
    const a = built[0].questions.map((q) => q.id).join()
    const b = built[1].questions.map((q) => q.id).join()
    expect(a).not.toBe(b)
  })

  it('rarely repeats a whole paper — the pool is big enough to matter', () => {
    const signatures = built.map((p) => p.questions.map((q) => q.id).sort().join())
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  it('reaches deep into the pool across many draws', () => {
    // If the draw favoured the front of the pool, most questions would never
    // appear. Sixty papers should touch a large share of 450 questions.
    const seen = new Set(built.flatMap((p) => p.questions.map((q) => q.id)))
    expect(seen.size).toBeGreaterThan(300)
  })
})
