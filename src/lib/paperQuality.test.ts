import { describe, it, expect } from 'vitest'
import listening from '../data/listening.json'
import reading from '../data/reading.json'
import { listeningPapers, readingPapers, type Paper } from './paper'
import {
  measureItem,
  reportPart,
  lopsidedItems,
  MAX_LENGTH_RATIO,
  type PartLike,
} from './paperQuality'

describe('measureItem', () => {
  it('spots the answer that is the only long option', () => {
    const r = measureItem({
      id: 'Q',
      correct: 'A',
      options: [
        { key: 'A', text: 'The lift cannot be used at the moment.' },
        { key: 'B', text: 'The lift is free.' },
        { key: 'C', text: 'Use the lift.' },
      ],
    })
    expect(r?.correctIsLongest).toBe(true)
    expect(r?.ratio).toBeGreaterThan(MAX_LENGTH_RATIO)
  })

  it('does not blame a tie for being long', () => {
    const r = measureItem({
      id: 'Q',
      correct: 'A',
      options: [
        { key: 'A', text: 'aaaaaaaaaa' },
        { key: 'B', text: 'bbbbbbbbbb' },
      ],
    })
    expect(r?.correctIsLongest).toBe(false)
  })

  it('ignores picture options, which have no text to measure', () => {
    expect(
      measureItem({ id: 'Q', correct: 'A', options: [{ key: 'A', art: 'clock:7:15' }] }),
    ).toBeNull()
  })
})

describe('lopsidedItems', () => {
  it('leaves a superlative alone — "the most interesting" is long because it must be', () => {
    const part: PartLike = {
      id: 'G',
      items: [
        {
          id: 'G2',
          correct: 'C',
          options: [
            { key: 'A', text: 'the most interested' },
            { key: 'B', text: 'more interesting' },
            { key: 'C', text: 'the most interesting' },
            { key: 'D', text: 'as interesting' },
          ],
        },
      ],
    }
    expect(lopsidedItems(part)).toHaveLength(0)
  })

  it('leaves short grammar options alone — "comes" vs "is coming" is the point', () => {
    const part: PartLike = {
      id: 'G',
      items: [
        {
          id: 'G1',
          correct: 'B',
          options: [
            { key: 'A', text: 'comes' },
            { key: 'B', text: 'is coming' },
            { key: 'C', text: 'came' },
            { key: 'D', text: 'come' },
          ],
        },
      ],
    }
    expect(lopsidedItems(part)).toHaveLength(0)
  })

  it('flags a sentence option that dwarfs its rivals', () => {
    const part: PartLike = {
      id: 'S',
      items: [
        {
          id: 'S1',
          correct: 'A',
          options: [
            { key: 'A', text: 'The class has been moved to a different room this week.' },
            { key: 'B', text: 'The class is cancelled.' },
            { key: 'C', text: 'The class is full.' },
          ],
        },
      ],
    }
    expect(lopsidedItems(part).map((r) => r.id)).toEqual(['S1'])
  })
})

describe('reportPart', () => {
  it('returns nothing for a part with no text options to judge', () => {
    expect(
      reportPart({ id: 'P', items: [{ id: 'P1', correct: 'A', options: [{ key: 'A', art: 'x' }] }] }),
    ).toBeNull()
  })

  it('names the letters that are never the answer', () => {
    const opts = [
      { key: 'A', text: 'one' },
      { key: 'B', text: 'two' },
      { key: 'C', text: 'six' },
    ]
    const r = reportPart({
      id: 'P',
      items: [
        { id: '1', correct: 'A', options: opts },
        { id: '2', correct: 'B', options: opts },
        { id: '3', correct: 'A', options: opts },
      ],
    })
    expect(r?.unusedKeys).toEqual(['C'])
  })
})

/* --------------------------------------------------------------------------
   The real papers. These are the guards that must keep holding as papers are
   added: a paper that fails here can be passed by strategy instead of English.
   -------------------------------------------------------------------------- */

const PAPERS: [string, { parts: PartLike[] }][] = [
  ['reading', reading as unknown as { parts: PartLike[] }],
  ['listening', listening as unknown as { parts: PartLike[] }],
]

describe.each(PAPERS)('%s paper', (_name, paper) => {
  const reports = paper.parts.map(reportPart).filter((r) => r !== null)

  it('never lets "pick the longest option" beat guessing', () => {
    for (const r of reports) {
      expect(
        r.longestWins,
        `${r.partId}: đáp án đúng là phương án dài nhất ở ${r.longestWins}/${r.scored} câu ` +
          `(ngẫu nhiên ~${r.expectedByChance.toFixed(1)})`,
      ).toBeLessThanOrEqual(r.allowedLongestWins)
    }
  })

  it('never lets "cross out the longest option" beat guessing either', () => {
    for (const r of reports) {
      expect(
        r.longestWins,
        `${r.partId}: đáp án đúng KHÔNG BAO GIỜ là phương án dài nhất ` +
          `(${r.longestWins}/${r.scored}) — loại câu dài là thu hẹp được lựa chọn`,
      ).toBeGreaterThanOrEqual(r.requiredLongestWins)
    }
  })

  it('keeps every option in a question roughly the same length', () => {
    for (const r of reports) {
      expect(
        r.lopsided.map((l) => `${l.id} (${l.shortest}→${l.longest} ký tự)`),
        `${r.partId}: phương án dài gấp hơn ${MAX_LENGTH_RATIO}× phương án ngắn nhất`,
      ).toEqual([])
    }
  })

  it('uses every answer letter at least once in each part', () => {
    for (const r of reports) {
      expect(r.unusedKeys, `${r.partId}: chữ cái không bao giờ là đáp án`).toEqual([])
    }
  })
})

/* --------------------------------------------------------------------------
   A second paper only helps if it is genuinely a second paper. Two papers that
   share questions are one paper with extra steps.
   -------------------------------------------------------------------------- */

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function reusedText(a: Paper, b: Paper): string[] {
  /**
   * What the candidate actually reads. For a short-text item that is the notice
   * — its prompt is a fixed stem ("What does this notice tell you?") that every
   * paper of this type reuses on purpose. A gap-fill item has neither; the
   * passage comparison below covers those.
   */
  const promptOf = (q: Paper['questions'][number]) => normalise(q.notice ?? q.prompt ?? '')
  const seen = new Set(a.questions.map(promptOf).filter((t) => t.length > 12))
  const passages = new Set(
    a.questions.map((q) => normalise(q.passage?.body ?? '')).filter((t) => t.length > 40),
  )

  const clashes: string[] = []
  for (const q of b.questions) {
    if (promptOf(q).length > 12 && seen.has(promptOf(q))) {
      clashes.push(`${q.id}: câu hỏi trùng đề trước`)
    }
    const body = normalise(q.passage?.body ?? '')
    if (body.length > 40 && passages.has(body)) {
      clashes.push(`${q.id}: đoạn văn trùng đề trước`)
    }
  }
  return [...new Set(clashes)]
}

describe.each([
  ['reading', readingPapers],
  ['listening', listeningPapers],
])('%s papers are actually different papers', (_name, papers) => {
  it('never repeats a question or a passage from an earlier paper', () => {
    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        expect(
          reusedText(papers[i], papers[j]),
          `${papers[i].label} vs ${papers[j].label}`,
        ).toEqual([])
      }
    }
  })

  it('gives every paper a distinct label', () => {
    const labels = papers.map((p) => p.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps every paper the same length and duration as the first', () => {
    for (const p of papers) {
      expect(p.questions.length, p.label).toBe(papers[0].questions.length)
      expect(p.durationSeconds, p.label).toBe(papers[0].durationSeconds)
    }
  })
})
