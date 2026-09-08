import { describe, it, expect } from 'vitest'
import {
  validatePart,
  balanceAnswerKeys,
  type GeneratedPart,
  type PartSpec,
} from './aiPaperCheck'

const SPEC: PartSpec = { id: 'R1', items: 2, optionKeys: ['A', 'B', 'C', 'D'] }

const opts = (correct: string) => ({
  options: [
    { key: 'A', text: 'one' },
    { key: 'B', text: 'two' },
    { key: 'C', text: 'three' },
    { key: 'D', text: 'four' },
  ],
  correct,
  explain: 'Giải thích đủ dài để vượt ngưỡng kiểm tra tối thiểu.',
})

const part = (over: Partial<GeneratedPart> = {}): GeneratedPart => ({
  id: 'R1',
  items: [
    { id: 'Q1', prompt: 'a', ...opts('A') },
    { id: 'Q2', prompt: 'b', ...opts('B') },
  ],
  ...over,
})

describe('validatePart', () => {
  it('passes a part that is exactly what was asked for', () => {
    expect(validatePart(part(), SPEC)).toEqual([])
  })

  it('rejects the wrong number of questions', () => {
    const p = part()
    p.items = p.items.slice(0, 1)
    expect(validatePart(p, SPEC).join()).toMatch(/có 1 câu/)
  })

  it('rejects a correct answer that names no option', () => {
    const p = part()
    p.items[0].correct = 'E'
    expect(validatePart(p, SPEC).join()).toMatch(/không nằm trong các phương án/)
  })

  it('rejects the wrong set of option letters', () => {
    const p = part()
    p.items[0].options = [
      { key: 'A', text: 'one' },
      { key: 'B', text: 'two' },
      { key: 'C', text: 'three' },
    ]
    expect(validatePart(p, SPEC).join()).toMatch(/phải là \[A, B, C, D\]/)
  })

  it('rejects two options that say the same thing', () => {
    const p = part()
    p.items[0].options![1].text = 'One'
    expect(validatePart(p, SPEC).join()).toMatch(/trùng nội dung/)
  })

  it('rejects an explanation too short to teach anything', () => {
    const p = part()
    p.items[0].explain = 'Sai.'
    expect(validatePart(p, SPEC).join()).toMatch(/giải thích quá ngắn/)
  })

  it('rejects duplicate question ids', () => {
    const p = part()
    p.items[1].id = 'Q1'
    expect(validatePart(p, SPEC).join()).toMatch(/id câu hỏi bị trùng/)
  })

  it('rejects an item pointing at a passage that was never written', () => {
    const p = part({ passages: [{ id: 'P1', title: 't', body: 'w '.repeat(80) }] })
    p.items[0].passage = 'P9'
    const spec = { ...SPEC, passages: 1 }
    expect(validatePart(p, spec).join()).toMatch(/không tồn tại/)
  })

  it('rejects a passage too short to hold five questions', () => {
    const p = part({ passages: [{ id: 'P1', title: 't', body: 'too short' }] })
    expect(validatePart(p, { ...SPEC, passages: 1 }).join()).toMatch(/quá ngắn/)
  })

  it('checks Right/Wrong items by their own rules', () => {
    const spec: PartSpec = { id: 'R3', items: 1, optionKeys: ['A', 'B', 'C', 'D'], rightWrong: 1 }
    const ok: GeneratedPart = {
      id: 'R3',
      items: [
        {
          id: 'Q1',
          prompt: 'x',
          type: 'rightwrong',
          correct: 'B',
          explain: 'SAI. Bài đọc nói ngược lại với câu này.',
        },
      ],
    }
    expect(validatePart(ok, spec)).toEqual([])

    const bad = structuredClone(ok)
    bad.items[0].correct = 'C'
    expect(validatePart(bad, spec).join()).toMatch(/phải là A hoặc B/)
  })

  it('survives junk where a question should be', () => {
    const p = part()
    // A model that loses the thread can put anything in the array.
    ;(p.items as unknown[])[0] = null
    expect(validatePart(p, SPEC).length).toBeGreaterThan(0)
  })
})

describe('balanceAnswerKeys', () => {
  const many = (corrects: string[]): GeneratedPart => ({
    id: 'R1',
    items: corrects.map((c, i) => ({ id: `Q${i + 1}`, prompt: 'p', ...opts(c) })),
  })

  it('spreads the answer over every letter', () => {
    const before = many(Array(8).fill('A'))
    const after = balanceAnswerKeys(before)
    const counts = new Map<string, number>()
    for (const i of after.items) counts.set(i.correct, (counts.get(i.correct) ?? 0) + 1)
    expect([...counts.keys()].sort()).toEqual(['A', 'B', 'C', 'D'])
    expect([...counts.values()]).toEqual([2, 2, 2, 2])
  })

  it('keeps the same answer correct, only under a different letter', () => {
    const before = many(['A', 'A', 'A', 'A'])
    const after = balanceAnswerKeys(before)
    before.items.forEach((item, i) => {
      const wasRight = item.options!.find((o) => o.key === item.correct)!.text
      const nowRight = after.items[i].options!.find((o) => o.key === after.items[i].correct)!.text
      expect(nowRight).toBe(wasRight)
    })
  })

  it('keeps every option, losing and inventing nothing', () => {
    const after = balanceAnswerKeys(many(['A', 'A', 'A', 'A']))
    for (const item of after.items) {
      expect(item.options!.map((o) => o.text).sort()).toEqual(['four', 'one', 'three', 'two'])
      expect(item.options!.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    }
  })

  it('gives the same result every time it runs', () => {
    const a = balanceAnswerKeys(many(['A', 'B', 'A', 'B', 'A', 'B']))
    const b = balanceAnswerKeys(many(['A', 'B', 'A', 'B', 'A', 'B']))
    expect(a.items.map((i) => i.correct)).toEqual(b.items.map((i) => i.correct))
  })

  it('leaves Right/Wrong items alone', () => {
    const p: GeneratedPart = {
      id: 'R3',
      items: [{ id: 'Q1', type: 'rightwrong', correct: 'A', explain: 'x'.repeat(30) }],
    }
    expect(balanceAnswerKeys(p)).toEqual(p)
  })
})
