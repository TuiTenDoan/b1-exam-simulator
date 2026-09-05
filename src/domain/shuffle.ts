/**
 * Randomising a paper so practice tests understanding rather than position.
 *
 * Two rules the shuffle must never break:
 *  - RIGHT/WRONG questions keep A=RIGHT, B=WRONG. Swapping them is nonsense.
 *  - Questions whose passage shows numbered gaps must stay in their printed
 *    order, so grouping is respected rather than flattened.
 */
export type ShuffleKind = 'mcq' | 'rightwrong' | 'gap' | 'art'

export interface ShufflableOption {
  key: string
  text?: string
  art?: string
}

export interface ShufflableQuestion {
  id: string
  kind: ShuffleKind
  options: ShufflableOption[]
  correct: string
}

export type Rng = () => number

const LETTERS = 'ABCDEFGH'

/** mulberry32 — small, seeded, and good enough to lay out an exam paper. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Reorder a question's options and relabel them A, B, C… The correct answer
 * follows its own text to whatever position it lands in.
 */
export function shuffleOptions<T extends ShufflableQuestion>(question: T, rng: Rng): T {
  if (question.kind === 'rightwrong' || question.kind === 'gap') return question
  if (question.options.length < 2) return question

  const correctOption = question.options.find((o) => o.key === question.correct)
  const reordered = shuffled(question.options, rng)

  const options = reordered.map((option, i) => ({ ...option, key: LETTERS[i] }))
  const correctIndex = reordered.findIndex((o) => o === correctOption)

  return {
    ...question,
    options,
    correct: correctIndex >= 0 ? LETTERS[correctIndex] : question.correct,
  }
}

/**
 * Shuffle items inside each group while keeping groups contiguous and in their
 * original order — so questions never drift away from their passage or recording.
 */
export function shuffleWithinGroups<T>(
  items: readonly T[],
  groupOf: (item: T) => string,
  rng: Rng,
): T[] {
  const order: string[] = []
  const buckets = new Map<string, T[]>()

  for (const item of items) {
    const key = groupOf(item)
    if (!buckets.has(key)) {
      buckets.set(key, [])
      order.push(key)
    }
    buckets.get(key)!.push(item)
  }

  return order.flatMap((key) => shuffled(buckets.get(key)!, rng))
}
