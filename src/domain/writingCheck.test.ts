import { describe, it, expect } from 'vitest'
import { checkSentence, analyseEssay } from './writingCheck'

describe('checkSentence', () => {
  it('reports an empty answer rather than guessing at it', () => {
    expect(checkSentence('', { stem: 'In case it rains,', rule: 'future' }).verdict).toBe('empty')
    expect(checkSentence('   ', { stem: 'In case it rains,', rule: 'future' }).verdict).toBe('empty')
  })

  it('rejects an answer that just repeats the stem back', () => {
    const r = checkSentence('In case it rains', { stem: 'In case it rains,', rule: 'any' })
    expect(r.verdict).toBe('repeat')
  })

  it('requires a future form after a time or condition clause', () => {
    const opts = { stem: 'As soon as the exam is over,', rule: 'future' } as const

    expect(checkSentence('I will take a holiday.', opts).verdict).toBe('ok')
    expect(checkSentence("I'll take a holiday.", opts).verdict).toBe('ok')
    expect(checkSentence('I am going to take a holiday.', opts).verdict).toBe('ok')
    expect(checkSentence('I take a holiday.', opts).verdict).toBe('missing-future')
  })

  it('rejects will inside the time clause itself', () => {
    const opts = { stem: 'I will not get married until', rule: 'no-will' } as const

    expect(checkSentence('I am thirty years old.', opts).verdict).toBe('ok')
    expect(checkSentence('I will be thirty years old.', opts).verdict).toBe('will-in-time-clause')
  })

  it('requires would or a modal after "If only I had"', () => {
    const opts = { stem: 'If only I had a lot of money,', rule: 'would' } as const

    expect(checkSentence('I would help the poor.', opts).verdict).toBe('ok')
    expect(checkSentence("I'd buy a big house.", opts).verdict).toBe('ok')
    expect(checkSentence('I help the poor.', opts).verdict).toBe('missing-would')
  })

  it('accepts any reasonable clause where no specific form is required', () => {
    const r = checkSentence('we stayed at home.', { stem: 'It is raining so', rule: 'any' })
    expect(r.verdict).toBe('ok')
  })

  it('flags a one-word answer as too short to be a clause', () => {
    expect(checkSentence('yes', { stem: 'It is raining so', rule: 'any' }).verdict).toBe('too-short')
  })
})

describe('analyseEssay', () => {
  const topic = { keywords: ['internet', 'problem', 'solution'] }

  it('counts words and paragraphs from the real text', () => {
    const essay = 'One two three.\n\nFour five six.\n\nSeven eight.\n\nNine ten.'
    const r = analyseEssay(essay, topic)

    expect(r.words).toBe(10)
    expect(r.paragraphs).toBe(4)
  })

  it('scores length only inside the 120-180 band', () => {
    const short = analyseEssay('word '.repeat(50), topic)
    const right = analyseEssay('word '.repeat(150), topic)
    const long = analyseEssay('word '.repeat(300), topic)

    expect(short.checks.find((c) => c.id === 'length')?.pass).toBe(false)
    expect(right.checks.find((c) => c.id === 'length')?.pass).toBe(true)
    expect(long.checks.find((c) => c.id === 'length')?.pass).toBe(false)
  })

  it('notices linking words and topic keywords', () => {
    const essay =
      'Firstly the internet has a problem. Secondly there is another problem. ' +
      'To conclude, the solution is education.'
    const r = analyseEssay(essay, topic)

    expect(r.checks.find((c) => c.id === 'linkers')?.pass).toBe(true)
    expect(r.checks.find((c) => c.id === 'onTopic')?.pass).toBe(true)
  })

  it('never awards the marks it cannot judge', () => {
    const r = analyseEssay('word '.repeat(150) + '\n\na\n\nb\n\nc', topic)

    // The machine-checkable part tops out below the full 6 marks for this task.
    expect(r.maxAutoScore).toBeLessThan(6)
    expect(r.autoScore).toBeLessThanOrEqual(r.maxAutoScore)
    expect(r.humanMarks).toBeGreaterThan(0)
  })
})
