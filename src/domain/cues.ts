/**
 * Finds the words that give a question away — the time expressions and
 * comparison markers that decide which tense or form is correct.
 *
 * This is a study aid, not a scoring aid. Underlining "at the moment" tells a
 * learner where to look; it does not tell them the answer unless they already
 * know the rule, which is the point. It can be switched off once they stop
 * needing it, and it never touches the answer options — only the question.
 *
 * The phrases here are the same ones taught in the study section; a test keeps
 * the two lists from drifting apart, so the app never highlights a cue it
 * never explained.
 */

export type CueKind = 'present-simple' | 'present-continuous' | 'past-simple' | 'comparison'

export const CUE_LABEL: Record<CueKind, string> = {
  'present-simple': 'hiện tại đơn',
  'present-continuous': 'hiện tại tiếp diễn',
  'past-simple': 'quá khứ đơn',
  comparison: 'so sánh',
}

/**
 * Each entry is a regular-expression source matched case-insensitively with
 * word boundaries applied by the matcher. Order does not matter: overlaps are
 * resolved by preferring the longer match, so "right now" beats "now".
 */
const PATTERNS: { source: string; kind: CueKind }[] = [
  // Thói quen, tần suất → hiện tại đơn
  { source: 'always', kind: 'present-simple' },
  { source: 'usually', kind: 'present-simple' },
  { source: 'often', kind: 'present-simple' },
  { source: 'sometimes', kind: 'present-simple' },
  { source: 'rarely', kind: 'present-simple' },
  { source: 'never', kind: 'present-simple' },
  { source: 'every (?:day|week|month|year|morning|evening|summer)', kind: 'present-simple' },
  { source: '(?:once|twice|three times) a (?:day|week|month|year)', kind: 'present-simple' },
  { source: 'on (?:Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|Sundays)', kind: 'present-simple' },

  // Đang xảy ra lúc nói → hiện tại tiếp diễn
  { source: 'right now', kind: 'present-continuous' },
  { source: 'at the moment', kind: 'present-continuous' },
  { source: 'at present', kind: 'present-continuous' },
  { source: 'now', kind: 'present-continuous' },
  { source: 'today', kind: 'present-continuous' },
  { source: 'this (?:week|month)', kind: 'present-continuous' },
  { source: 'Look', kind: 'present-continuous' },
  { source: 'Listen', kind: 'present-continuous' },
  { source: 'Be quiet', kind: 'present-continuous' },

  // Mốc đã qua → quá khứ đơn
  { source: 'yesterday', kind: 'past-simple' },
  {
    source:
      'last (?:night|week|weekend|month|year|summer|winter|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
    kind: 'past-simple',
  },
  { source: '\\d+ (?:days|weeks|months|years|minutes|hours) ago', kind: 'past-simple' },
  { source: 'ago', kind: 'past-simple' },
  { source: 'in \\d{4}', kind: 'past-simple' },
  { source: 'when (?:I|he|she|we|they) was', kind: 'past-simple' },

  // Dạng so sánh
  { source: 'than', kind: 'comparison' },
  { source: 'the most', kind: 'comparison' },
  { source: 'one of', kind: 'comparison' },
  { source: 'of all the', kind: 'comparison' },
  { source: 'not as', kind: 'comparison' },
  { source: 'the same', kind: 'comparison' },
]

export interface CueHit {
  start: number
  end: number
  text: string
  kind: CueKind
}

/** A run of text, marked when it is a cue. */
export interface CueSegment {
  text: string
  kind?: CueKind
}

/**
 * Every cue in the text, left to right, without overlaps. Where two patterns
 * cover the same words the longer one wins, so a learner sees "at the moment"
 * rather than a stray "now" hiding inside it.
 */
export function findCues(text: string): CueHit[] {
  if (!text) return []

  const found: CueHit[] = []
  for (const { source, kind } of PATTERNS) {
    const re = new RegExp(`(?<![\\p{L}\\d])(?:${source})(?![\\p{L}\\d])`, 'giu')
    for (const m of text.matchAll(re)) {
      if (m.index === undefined) continue
      found.push({ start: m.index, end: m.index + m[0].length, text: m[0], kind })
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))

  const kept: CueHit[] = []
  for (const hit of found) {
    if (kept.some((k) => hit.start < k.end && k.start < hit.end)) continue
    kept.push(hit)
  }
  return kept
}

/** The same text split into plain runs and cue runs, ready to render. */
export function splitByCues(text: string): CueSegment[] {
  const hits = findCues(text)
  if (hits.length === 0) return [{ text }]

  const out: CueSegment[] = []
  let at = 0
  for (const hit of hits) {
    if (hit.start > at) out.push({ text: text.slice(at, hit.start) })
    out.push({ text: text.slice(hit.start, hit.end), kind: hit.kind })
    at = hit.end
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

/** One line per distinct cue, for the caption under a question. */
export function summariseCues(text: string): { text: string; kind: CueKind; label: string }[] {
  const seen = new Set<string>()
  const out: { text: string; kind: CueKind; label: string }[] = []
  for (const hit of findCues(text)) {
    const key = `${hit.text.toLowerCase()}|${hit.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text: hit.text, kind: hit.kind, label: CUE_LABEL[hit.kind] })
  }
  return out
}

/** Exposed so the study lesson and the highlighter can be checked against each other. */
export const CUE_SOURCES: readonly { source: string; kind: CueKind }[] = PATTERNS
