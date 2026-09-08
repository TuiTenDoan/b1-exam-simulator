/**
 * Gatekeeper for a paper that a language model just wrote.
 *
 * A generated paper is untrusted input. It arrives with the right shape often
 * enough to be useful and wrong often enough that handing it straight to a
 * learner would teach mistakes: a "correct" letter that names no option, four
 * options where three were asked for, an explanation that is one word long.
 * Everything here runs before a single question reaches the screen, and a part
 * that fails is thrown away rather than patched into something plausible.
 *
 * The one thing that IS patched is which letter carries the answer. Models
 * cluster answers on A and B; that is a pattern a learner can exploit without
 * reading, so the options are permuted to spread the key evenly. Permuting
 * cannot make a right answer wrong — it only renames the letters.
 */

export interface GeneratedOption {
  key: string
  text: string
}

export interface GeneratedItem {
  id: string
  prompt?: string
  notice?: string
  passage?: string
  gapNumber?: number
  type?: string
  options?: GeneratedOption[]
  correct: string
  explain: string
}

export interface GeneratedPassage {
  id: string
  title: string
  body: string
}

export interface GeneratedPart {
  id: string
  items: GeneratedItem[]
  passages?: GeneratedPassage[]
}

export interface PartSpec {
  id: string
  /** How many questions this part must contain. */
  items: number
  /** The exact option letters every multiple-choice item must offer. */
  optionKeys: string[]
  /** How many passages the part must supply, if any. */
  passages?: number
  /** How many items must be Right/Wrong (no options, correct is A or B). */
  rightWrong?: number
}

const MIN_EXPLAIN = 20

/** Null-safe: a model that loses the thread can put anything in the array. */
function isRightWrong(item: GeneratedItem | null | undefined): boolean {
  return item?.type === 'rightwrong'
}

/** Everything wrong with this part, in the order a reviewer would notice it. */
export function validatePart(part: GeneratedPart, spec: PartSpec): string[] {
  const problems: string[] = []
  const say = (m: string) => problems.push(`${spec.id}: ${m}`)

  if (part.id !== spec.id) say(`id là "${part.id}", phải là "${spec.id}"`)

  const items = Array.isArray(part.items) ? part.items : []
  if (items.length !== spec.items) say(`có ${items.length} câu, phải có ${spec.items}`)

  const ids = items.map((i) => i?.id ?? '')
  if (new Set(ids).size !== ids.length) say('id câu hỏi bị trùng')
  if (ids.some((id) => !id.trim())) say('có câu thiếu id')

  const passages = part.passages ?? []
  if ((spec.passages ?? 0) !== passages.length) {
    say(`có ${passages.length} đoạn văn, phải có ${spec.passages ?? 0}`)
  }
  for (const p of passages) {
    if (!p?.id?.trim() || !p?.body?.trim()) say('đoạn văn thiếu id hoặc nội dung')
    else if (p.body.trim().split(/\s+/).length < 60) say(`đoạn "${p.id}" quá ngắn`)
  }
  const passageIds = new Set(passages.map((p) => p?.id))

  const rightWrongCount = items.filter(isRightWrong).length
  if ((spec.rightWrong ?? 0) !== rightWrongCount) {
    say(`có ${rightWrongCount} câu Right/Wrong, phải có ${spec.rightWrong ?? 0}`)
  }

  const gapNumbers: number[] = []

  for (const item of items) {
    const at = item?.id || '(không id)'
    if (!item || typeof item !== 'object') {
      say('có phần tử không phải câu hỏi')
      continue
    }
    if ((item.explain ?? '').trim().length < MIN_EXPLAIN) say(`${at}: giải thích quá ngắn`)

    if (item.passage !== undefined && !passageIds.has(item.passage)) {
      say(`${at}: trỏ tới đoạn văn "${item.passage}" không tồn tại`)
    }
    if (item.gapNumber !== undefined) gapNumbers.push(item.gapNumber)

    if (isRightWrong(item)) {
      if (item.options?.length) say(`${at}: câu Right/Wrong không được kèm phương án`)
      if (item.correct !== 'A' && item.correct !== 'B') {
        say(`${at}: đáp án Right/Wrong phải là A hoặc B`)
      }
      continue
    }

    const options = item.options ?? []
    const keys = options.map((o) => o?.key)
    if (keys.join(',') !== spec.optionKeys.join(',')) {
      say(`${at}: phương án là [${keys.join(', ')}], phải là [${spec.optionKeys.join(', ')}]`)
      continue
    }
    const texts = options.map((o) => (o?.text ?? '').trim())
    if (texts.some((t) => !t)) say(`${at}: có phương án rỗng`)
    if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) {
      say(`${at}: hai phương án trùng nội dung`)
    }
    if (!spec.optionKeys.includes(item.correct)) {
      say(`${at}: đáp án "${item.correct}" không nằm trong các phương án`)
    }
  }

  if (gapNumbers.length && new Set(gapNumbers).size !== gapNumbers.length) {
    say('số thứ tự chỗ trống bị trùng')
  }

  return problems
}

/**
 * Spread the correct answers evenly over the option letters.
 *
 * Only the letters move; each option keeps its text, and the item keeps the
 * same single correct answer. Deterministic, so the same part always comes out
 * the same way.
 */
export function balanceAnswerKeys(part: GeneratedPart): GeneratedPart {
  const scorable = part.items.filter((i) => i && !isRightWrong(i) && i.options?.length)
  if (scorable.length === 0) return part

  const letters = (scorable[0].options ?? []).map((o) => o.key)
  const owed = new Map<string, number>(letters.map((l) => [l, 0]))
  scorable.forEach((_, i) => {
    const l = letters[i % letters.length]
    owed.set(l, (owed.get(l) ?? 0) + 1)
  })

  const items = part.items.map((item) => {
    if (!item || isRightWrong(item) || !item.options?.length) return item

    // Hand this item the letter that is still owed the most; ties break by
    // letter order so the result never depends on iteration luck.
    const want = [...owed.entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]

    if (!want || want === item.correct) {
      if (want) owed.set(want, (owed.get(want) ?? 0) - 1)
      return item
    }
    owed.set(want, (owed.get(want) ?? 0) - 1)

    const byKey = new Map(item.options.map((o) => [o.key, o.text]))
    const held = byKey.get(item.correct)!
    const displaced = byKey.get(want)!
    byKey.set(want, held)
    byKey.set(item.correct, displaced)

    return {
      ...item,
      options: letters.map((k) => ({ key: k, text: byKey.get(k)! })),
      correct: want,
    }
  })

  return { ...part, items }
}
