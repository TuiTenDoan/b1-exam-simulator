import { describe, it, expect } from 'vitest'
import { buildAttempt, listeningPaper, readingPaper } from './paper'

const papers = [
  ['listening', listeningPaper],
  ['reading', readingPaper],
] as const

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 13)

/** The option text a question's `correct` key actually points at. */
function correctText(q: { options: { key: string; text?: string; art?: string }[]; correct: string }) {
  const hit = q.options.find((o) => o.key === q.correct)
  return hit ? (hit.text ?? hit.art ?? q.correct) : q.correct
}

describe.each(papers)('%s paper under shuffling', (_name, paper) => {
  const baseline = new Map(paper.questions.map((q) => [q.id, q]))

  it('returns the paper untouched when shuffling is off', () => {
    expect(buildAttempt(paper, { shuffle: false, seed: 1 })).toBe(paper)
  })

  it('keeps every question exactly once and renumbers 1..N', () => {
    for (const seed of SEEDS) {
      const attempt = buildAttempt(paper, { shuffle: true, seed })

      expect(attempt.questions).toHaveLength(paper.questions.length)
      expect(new Set(attempt.questions.map((q) => q.id)).size).toBe(paper.questions.length)
      expect(attempt.questions.map((q) => q.number)).toEqual(
        paper.questions.map((_, i) => i + 1),
      )
    }
  })

  it('never changes which answer is correct, only where it sits', () => {
    for (const seed of SEEDS) {
      for (const q of buildAttempt(paper, { shuffle: true, seed }).questions) {
        expect(correctText(q)).toBe(correctText(baseline.get(q.id)!))
      }
    }
  })

  it('keeps the answer key in step with the shuffled options', () => {
    for (const seed of SEEDS) {
      const attempt = buildAttempt(paper, { shuffle: true, seed })
      const key = new Map(attempt.answerKey.map((k) => [k.id, k.correct]))
      for (const q of attempt.questions) {
        expect(key.get(q.id)).toBe(q.correct)
      }
    }
  })

  it('leaves RIGHT/WRONG questions with A=RIGHT and B=WRONG', () => {
    for (const seed of SEEDS) {
      for (const q of buildAttempt(paper, { shuffle: true, seed }).questions) {
        if (q.kind !== 'rightwrong') continue
        expect(q.options.map((o) => o.key)).toEqual(['A', 'B'])
        expect(q.options[0].text).toMatch(/RIGHT/)
        expect(q.correct).toBe(baseline.get(q.id)!.correct)
      }
    }
  })

  it('holds locked parts in their printed order', () => {
    const lockedIds = paper.questions.filter((q) => q.lockOrder).map((q) => q.id)

    for (const seed of SEEDS) {
      const attempt = buildAttempt(paper, { shuffle: true, seed })
      const seen = attempt.questions.filter((q) => q.lockOrder).map((q) => q.id)
      expect(seen).toEqual(lockedIds)
    }
  })

  it('actually varies the question order between sittings', () => {
    const firstIds = new Set(
      SEEDS.map((seed) => buildAttempt(paper, { shuffle: true, seed }).questions[0].id),
    )
    // The opening question should not be a fixed one across 25 different sittings.
    expect(firstIds.size).toBeGreaterThan(1)
  })

  it('never separates a question from its passage', () => {
    for (const seed of SEEDS) {
      const attempt = buildAttempt(paper, { shuffle: true, seed })
      const passageRun = attempt.questions
        .map((q) => q.passageId)
        .filter((p): p is string => Boolean(p))

      // Each passage id must appear as one unbroken run.
      const runs: string[] = []
      for (const p of passageRun) {
        if (runs[runs.length - 1] !== p) runs.push(p)
      }
      expect(new Set(runs).size).toBe(runs.length)
    }
  })
})
