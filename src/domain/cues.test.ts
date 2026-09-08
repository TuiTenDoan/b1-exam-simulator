import { describe, it, expect } from 'vitest'
import { findCues, splitByCues, summariseCues, CUE_LABEL } from './cues'
import { readingPapers } from '../lib/paper'
import studyData from '../data/study.json'
import { CUE_SOURCES } from './cues'

describe('findCues', () => {
  it('finds a frequency word and calls it the present simple', () => {
    const [hit] = findCues('He plays football twice a week.')
    expect(hit.text).toBe('twice a week')
    expect(hit.kind).toBe('present-simple')
  })

  it('finds the marker for something happening right now', () => {
    expect(findCues('She is working in the garden at the moment.')[0]).toMatchObject({
      text: 'at the moment',
      kind: 'present-continuous',
    })
  })

  it('finds a past time marker', () => {
    expect(findCues('We visited them last weekend.')[0]).toMatchObject({
      text: 'last weekend',
      kind: 'past-simple',
    })
  })

  it('finds the comparison marker', () => {
    expect(findCues('This bag is heavier than that one.')[0]).toMatchObject({
      text: 'than',
      kind: 'comparison',
    })
  })

  it('prefers the longer phrase when two cues overlap', () => {
    // "now" sits inside "right now"; showing both would be noise.
    const hits = findCues('Come here right now.')
    expect(hits).toHaveLength(1)
    expect(hits[0].text).toBe('right now')
  })

  it('does not match a cue hidden inside a longer word', () => {
    expect(findCues('I know Chicago and I like winter.')).toEqual([])
  })

  it('matches whatever the writer capitalised', () => {
    expect(findCues('Yesterday was cold.')[0].text).toBe('Yesterday')
  })

  it('returns the cues in the order they are read', () => {
    const hits = findCues('I usually walk, but this week I am taking the bus.')
    expect(hits.map((h) => h.text)).toEqual(['usually', 'this week'])
  })

  it('finds nothing in a sentence that gives nothing away', () => {
    expect(findCues('The book is on the table.')).toEqual([])
  })
})

describe('splitByCues', () => {
  it('keeps the sentence intact when the pieces are joined back up', () => {
    const text = 'Look! The bus is coming and it never stops here.'
    expect(splitByCues(text).map((s) => s.text).join('')).toBe(text)
  })

  it('marks only the cue runs', () => {
    const parts = splitByCues('He never comes on Sundays.')
    expect(parts.filter((p) => p.kind).map((p) => p.text)).toEqual(['never', 'on Sundays'])
    expect(parts.filter((p) => !p.kind).length).toBeGreaterThan(0)
  })

  it('returns the whole text as one plain run when there is no cue', () => {
    expect(splitByCues('Nothing to see.')).toEqual([{ text: 'Nothing to see.' }])
  })

  it('handles an empty prompt without inventing a segment', () => {
    expect(splitByCues('')).toEqual([{ text: '' }])
  })
})

describe('summariseCues', () => {
  it('names the tense each cue points at', () => {
    expect(summariseCues('We went there yesterday.')).toEqual([
      { text: 'yesterday', kind: 'past-simple', label: CUE_LABEL['past-simple'] },
    ])
  })

  it('lists a repeated cue once', () => {
    const out = summariseCues('He always walks and she always runs.')
    expect(out).toHaveLength(1)
  })
})

describe('cues on the real papers', () => {
  const grammarPrompts = readingPapers.flatMap((p) =>
    p.questions.filter((q) => q.partId === 'R1').map((q) => q.prompt),
  )

  it('finds a cue in most grammar questions — that is what makes them answerable', () => {
    const withCue = grammarPrompts.filter((t) => findCues(t).length > 0)
    expect(grammarPrompts.length).toBeGreaterThan(30)
    // Some items test subject-verb agreement rather than a time marker, so the
    // bar is "most", not "all".
    expect(withCue.length / grammarPrompts.length).toBeGreaterThan(0.7)
  })

  it('never mangles a prompt it highlights', () => {
    for (const p of readingPapers.flatMap((paper) => paper.questions)) {
      const text = p.prompt ?? ''
      expect(splitByCues(text).map((s) => s.text).join(''), p.id).toBe(text)
    }
  })
})

/* --------------------------------------------------------------------------
   The underline is only a teaching aid if the learner has been taught what it
   means. Anything the app highlights must appear in the study lesson for that
   same tense — the reverse is fine, since the lesson may teach more than the
   matcher is confident enough to underline.
   -------------------------------------------------------------------------- */

const CARD_FOR: Record<string, string> = {
  'present-simple': 'Hiện tại đơn',
  'present-continuous': 'Hiện tại tiếp diễn',
  'past-simple': 'Quá khứ đơn',
  comparison: 'So sánh',
}

/** "every (?:day|week)" -> ["every day", "every week"] */
function expand(source: string): string[] {
  // Plain string swaps, not regexes: the needle here is itself regex source,
  // and escaping a backslash through two layers is how the last bug got in.
  const probe = source.split('\\d{4}').join('1920').split('\\d+').join('2')
  let out = [probe]
  for (let guard = 0; guard < 4; guard++) {
    const next: string[] = []
    let grew = false
    for (const s of out) {
      const m = s.match(/\(\?:([^)]*)\)/)
      if (!m) {
        next.push(s)
        continue
      }
      grew = true
      for (const alt of m[1].split('|')) {
        next.push(s.slice(0, m.index) + alt + s.slice((m.index ?? 0) + m[0].length))
      }
    }
    out = next
    if (!grew) break
  }
  return out.map((s) => s.trim().toLowerCase())
}

describe('cues match what the study lesson teaches', () => {
  const cards = (studyData.lessons as unknown as { blocks: Record<string, unknown>[] }[])
    .flatMap((l) => l.blocks)
    .filter((b) => b.type === 'tense')

  it('teaches every phrase it underlines', () => {
    const untaught: string[] = []

    for (const { source, kind } of CUE_SOURCES) {
      const card = cards.find((c) => c.name === CARD_FOR[kind])
      expect(card, `phần Học thiếu bài cho ${kind}`).toBeTruthy()

      const taught = [
        ...((card!.signals as string[]) ?? []),
        (card!.signalNote as string) ?? '',
        (card!.use as string) ?? '',
      ]
        .join(' | ')
        .toLowerCase()

      const probes = expand(source)
      const lastWords = probes.map((p) => p.split(' ').pop() ?? '')
      const ok = [...probes, ...lastWords].some((p) => p.length > 1 && taught.includes(p))
      if (!ok) untaught.push(`${kind}: ${source}`)
    }

    expect(untaught, 'app gạch chân dấu hiệu mà bài học chưa nhắc tới').toEqual([])
  })
})
