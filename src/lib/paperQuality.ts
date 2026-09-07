/**
 * Guards against a paper that can be passed without reading it.
 *
 * A multiple-choice paper leaks its own answers in ways the author never
 * intends: the correct option ends up being the one that needed the most words
 * to state, or one letter quietly never gets used. A learner who spots either
 * pattern stops reading the question, scores well, and learns nothing — which
 * is exactly the complaint this module exists to answer.
 *
 * Option shuffling at runtime hides the letter pattern but does nothing about
 * length: whichever letter it lands on, the longest option is still the answer.
 * So length is checked here, in the data, where it can actually be fixed.
 */

export interface QuestionLike {
  id: string
  correct: string
  options?: { key: string; text?: string; art?: string }[]
}

export interface PartLike {
  id: string
  items: QuestionLike[]
}

/**
 * Below this, an option is a word or a verb form, and its length is dictated by
 * the grammar rather than chosen by the author: "comes" and "is coming" differ
 * by 80% and always will, because that difference IS the question. Forcing them
 * to match would mean not testing the continuous tense at all.
 *
 * Grammar parts are therefore judged only by the part-level rule — the answer
 * must not be the longest option often enough to be worth guessing on — which
 * is fixed by balancing which tense is correct, not by padding words.
 *
 * Above this, options are clauses or sentences the author could have written at
 * any length, so a lopsided one is a leak the author put there.
 */
const SENTENCE_LENGTH = 25

/** How much the longest sentence-option may exceed the shortest. */
export const MAX_LENGTH_RATIO = 1.4

export interface ItemLengthReport {
  id: string
  shortest: number
  longest: number
  ratio: number
  correctIsLongest: boolean
}

function textOptions(q: QuestionLike): { key: string; text: string }[] {
  return (q.options ?? [])
    .filter((o): o is { key: string; text: string } => typeof o.text === 'string')
    .map((o) => ({ key: o.key, text: o.text }))
}

/** Items whose options are all plain text; picture and Right/Wrong items opt out. */
export function scorableItems(part: PartLike): QuestionLike[] {
  return part.items.filter((q) => {
    const opts = textOptions(q)
    return opts.length >= 2 && opts.length === (q.options ?? []).length
  })
}

export function measureItem(q: QuestionLike): ItemLengthReport | null {
  const opts = textOptions(q)
  if (opts.length < 2) return null

  const lengths = opts.map((o) => o.text.length)
  const longest = Math.max(...lengths)
  const shortest = Math.min(...lengths)
  const correctText = opts.find((o) => o.key === q.correct)?.text ?? ''
  const uniqueLongest = lengths.filter((l) => l === longest).length === 1

  return {
    id: q.id,
    shortest,
    longest,
    ratio: shortest === 0 ? Infinity : longest / shortest,
    correctIsLongest: uniqueLongest && correctText.length === longest,
  }
}

/**
 * Items where one option is so much longer than the rest that its length alone
 * marks it out. Short-option items are exempt — see SENTENCE_LENGTH.
 */
export function lopsidedItems(part: PartLike): ItemLengthReport[] {
  return scorableItems(part)
    .map(measureItem)
    .filter((r): r is ItemLengthReport => r !== null)
    .filter((r) => r.longest >= SENTENCE_LENGTH && r.ratio > MAX_LENGTH_RATIO)
}

export interface PartReport {
  partId: string
  scored: number
  optionCount: number
  /** Items where the correct answer is the single longest option. */
  longestWins: number
  /** How many such items pure chance would produce. */
  expectedByChance: number
  /** The most that is tolerated before the pattern is a usable strategy. */
  allowedLongestWins: number
  /**
   * The fewest tolerated. Zero is not the safe answer: if the longest option is
   * never right, crossing it out turns a 1-in-3 guess into 1-in-2. Only applied
   * where the options are long enough for a learner to compare them at a glance.
   */
  requiredLongestWins: number
  /** Letters that are never the correct answer anywhere in the part. */
  unusedKeys: string[]
  lopsided: ItemLengthReport[]
}

export function reportPart(part: PartLike): PartReport | null {
  const scored = scorableItems(part)
  if (scored.length === 0) return null

  const optionCount = (scored[0].options ?? []).length
  const reports = scored.map(measureItem).filter((r): r is ItemLengthReport => r !== null)
  const longestWins = reports.filter((r) => r.correctIsLongest).length
  const expectedByChance = scored.length / optionCount

  const keysInUse = new Set((scored[0].options ?? []).map((o) => o.key))
  const keysUsedAsAnswer = new Set(scored.map((q) => q.correct))

  // Comparing four single words by length is not a strategy anyone runs;
  // comparing three full sentences is. So the floor applies only to parts
  // written in sentences, and only where there are enough items to mean
  // anything.
  const sentenceOptions = reports.some((r) => r.longest >= SENTENCE_LENGTH)
  const requiredLongestWins =
    sentenceOptions && scored.length >= 8 ? Math.max(0, Math.floor(expectedByChance) - 1) : 0

  return {
    partId: part.id,
    scored: scored.length,
    optionCount,
    longestWins,
    expectedByChance,
    // One over chance absorbs honest variation; two over is a strategy.
    allowedLongestWins: Math.ceil(expectedByChance) + 1,
    requiredLongestWins,
    unusedKeys: [...keysInUse].filter((k) => !keysUsedAsAnswer.has(k)).sort(),
    lopsided: lopsidedItems(part),
  }
}

export function reportPaper(parts: PartLike[]): PartReport[] {
  return parts.map(reportPart).filter((r): r is PartReport => r !== null)
}
