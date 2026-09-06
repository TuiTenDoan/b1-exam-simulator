import { describe, it, expect } from 'vitest'
import { parseAiMark } from './aiMark'

describe('parseAiMark', () => {
  it('reads a well-formed reply', () => {
    const m = parseAiMark({
      ideas: 2.5,
      language: 1.5,
      comment_vi: 'Bố cục rõ ràng.',
      errors: [{ wrong: 'It bring', fix: 'It brings', why_vi: 'Chủ ngữ số ít.' }],
    })

    expect(m.ideas).toBe(2.5)
    expect(m.language).toBe(1.5)
    expect(m.total).toBe(4)
    expect(m.comment).toBe('Bố cục rõ ràng.')
    expect(m.errors).toHaveLength(1)
  })

  it('clamps scores that fall outside the band', () => {
    expect(parseAiMark({ ideas: 9, language: -4 }).ideas).toBe(3)
    expect(parseAiMark({ ideas: 9, language: -4 }).language).toBe(0)
  })

  it('survives a reply with missing or wrongly typed fields', () => {
    const m = parseAiMark({ ideas: 'two', errors: 'none' })

    expect(m.ideas).toBe(0)
    expect(m.language).toBe(0)
    expect(m.comment).toBe('')
    expect(m.errors).toEqual([])
  })

  it('drops error entries that have nothing to show', () => {
    const m = parseAiMark({
      errors: [
        { wrong: 'a', fix: 'b', why_vi: 'c' },
        { wrong: '', fix: '', why_vi: '' },
        { fix: 'only a fix' },
      ],
    })

    expect(m.errors).toHaveLength(1)
    expect(m.errors[0]).toEqual({ wrong: 'a', fix: 'b', why: 'c' })
  })

  it('caps the error list so one bad reply cannot flood the page', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      wrong: `w${i}`,
      fix: `f${i}`,
      why_vi: `y${i}`,
    }))

    expect(parseAiMark({ errors: many }).errors.length).toBeLessThanOrEqual(8)
  })

  it('rejects a reply that is not an object at all', () => {
    expect(() => parseAiMark(null)).toThrow()
    expect(() => parseAiMark('sorry, I cannot help with that')).toThrow()
  })
})
