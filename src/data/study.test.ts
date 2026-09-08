import { describe, it, expect } from 'vitest'
import study from './study.json'
import writing from './writing.json'

/**
 * The study section is reference material a learner will trust, and the screen
 * renders each block by its `type`. A block with the wrong type renders as
 * nothing at all — silently, with no error — so the shapes are checked here
 * rather than discovered by a reader finding a blank space where the tense
 * rules should be.
 */

type Block = Record<string, unknown> & { type: string; name: string }
type Lesson = { id: string; title: string; vi: string; source: string; intro: string; blocks: Block[] }

const lessons = study.lessons as unknown as Lesson[]

/** Every type the screen knows how to draw. */
const RENDERABLE = ['tense', 'pattern', 'steps', 'checklist', 'phrases', 'topics', 'note']

/** Fields without which a block would render half-empty. */
const REQUIRED: Record<string, string[]> = {
  tense: ['use', 'forms', 'signals', 'example', 'traps'],
  pattern: ['rule', 'stems', 'example', 'traps'],
  steps: ['items'],
  checklist: ['items'],
  phrases: ['items'],
  topics: ['items'],
  note: ['body'],
}

describe('study content', () => {
  it('has lessons with unique ids', () => {
    const ids = lessons.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(0)
  })

  it('gives every lesson a title, a summary, a source and an intro', () => {
    for (const l of lessons) {
      for (const field of ['title', 'vi', 'source', 'intro'] as const) {
        expect(l[field]?.trim(), `${l.id}.${field}`).toBeTruthy()
      }
      expect(l.blocks.length, l.id).toBeGreaterThan(0)
    }
  })

  it('only uses block types the screen can draw', () => {
    for (const l of lessons) {
      for (const b of l.blocks) {
        expect(RENDERABLE, `${l.id} / ${b.name}`).toContain(b.type)
      }
    }
  })

  it('fills in every field its block type needs', () => {
    for (const l of lessons) {
      for (const b of l.blocks) {
        expect(b.name?.trim(), `${l.id}: khối thiếu tên`).toBeTruthy()
        for (const field of REQUIRED[b.type] ?? []) {
          const v = b[field]
          const filled = Array.isArray(v) ? v.length > 0 : Boolean(v)
          expect(filled, `${l.id} / ${b.name}: thiếu "${field}"`).toBe(true)
        }
      }
    }
  })

  it('keeps every block name unique inside its lesson — the screen keys on it', () => {
    for (const l of lessons) {
      const names = l.blocks.map((b) => b.name)
      expect(new Set(names).size, l.id).toBe(names.length)
    }
  })

  it('gives each example both the English and the Vietnamese half', () => {
    for (const l of lessons) {
      for (const b of l.blocks) {
        const eg = b.example as { en?: string; vi?: string } | undefined
        if (!eg) continue
        expect(eg.en?.trim(), `${l.id} / ${b.name}`).toBeTruthy()
        expect(eg.vi?.trim(), `${l.id} / ${b.name}`).toBeTruthy()
      }
    }
  })

  it('keeps every table rectangular', () => {
    for (const l of lessons) {
      for (const b of l.blocks) {
        const t = b.table as { head: string[]; rows: string[][] } | undefined
        if (!t) continue
        for (const row of t.rows) {
          expect(row.length, `${l.id} / ${b.name}`).toBe(t.head.length)
        }
      }
    }
  })

  it('covers the four grammar points the revision document tests', () => {
    const tenses = lessons
      .flatMap((l) => l.blocks)
      .filter((b) => b.type === 'tense')
      .map((b) => b.name)

    expect(tenses).toEqual([
      'Hiện tại đơn',
      'Hiện tại tiếp diễn',
      'Quá khứ đơn',
      'So sánh',
    ])
  })

  it('teaches a pattern for every rule the writing checker enforces', () => {
    // writingCheck.ts marks against 'future', 'no-will' and 'would'. A learner
    // who is graded on a rule that no lesson mentions is being marked on
    // something the app never taught.
    const text = JSON.stringify(lessons).toLowerCase()
    expect(text).toContain('will')
    expect(text).toContain('would')
    expect(text).toContain('as soon as')
    expect(text).toContain('until')
  })

  it('teaches every one of the twenty sentences that can come up', () => {
    // The exam draws eight of the document's twenty stems. A stem that belongs
    // to no group is a sentence the learner was never shown how to finish.
    const taught = lessons
      .flatMap((l) => l.blocks)
      .filter((b) => b.type === 'pattern')
      .flatMap((b) => (b.stems as string[]) ?? [])
      .map((s) => s.replace(/\s*…\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase())

    const inExam = writing.part1.items.map((i) =>
      i.stem.replace(/\s+/g, ' ').trim().toLowerCase(),
    )

    expect(taught.length, 'một câu bị xếp vào hai nhóm').toBe(new Set(taught).size)
    for (const stem of inExam) {
      expect(taught, `chưa dạy: "${stem}"`).toContain(stem)
    }
    expect(taught.length).toBe(inExam.length)
  })
})
