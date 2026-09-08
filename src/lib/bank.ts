import grammar from '../data/bank/grammar.json'
import vocabulary from '../data/bank/vocabulary.json'
import shortTexts from '../data/bank/shortTexts.json'
import comprehension from '../data/bank/comprehension.json'
import gapfill from '../data/bank/gapfill.json'
import reading1 from '../data/reading.json'
import reading2 from '../data/reading2.json'
import reading3 from '../data/reading3.json'
import reading4 from '../data/reading4.json'
import { makeRng, type Rng } from '../domain/shuffle'
import { balanceAnswerKeys, type GeneratedItem } from './aiPaperCheck'
import { measureItem } from './paperQuality'
import type { RawPaper } from './paper'

/**
 * Assembles a Reading paper by drawing from every question the app owns.
 *
 * Four fixed papers get memorised; a pool does not. The four built-in papers
 * are folded into the pool alongside the standalone bank, so a drawn paper can
 * mix a grammar item from paper 2 with a notice from the bank — which is the
 * point, and why the bank is not kept separate.
 *
 * Passage questions cannot be drawn one at a time: five questions about a text
 * only make sense with that text. They are drawn as whole blocks instead.
 */

interface BankItem extends GeneratedItem {
  prompt?: string
  notice?: string
}

interface PassageBlock {
  id: string
  title: string
  body: string
  /** Right/Wrong texts and best-answer texts are not interchangeable. */
  kind: 'rightwrong' | 'mcq'
  items: BankItem[]
}

type RawPart = {
  id: string
  passages?: { id: string; title: string; body: string }[]
  items: (BankItem & { passage?: string })[]
}

const PAPERS = [reading1, reading2, reading3, reading4] as unknown as { parts: RawPart[] }[]

function partOf(paper: { parts: RawPart[] }, id: string): RawPart | undefined {
  return paper.parts.find((p) => p.id === id)
}

/** Standalone questions — the ones that carry their own context. */
function loosePool(partId: string, extra: BankItem[]): BankItem[] {
  const fromPapers = PAPERS.flatMap((p) => partOf(p, partId)?.items ?? [])
  return [...fromPapers, ...extra]
}

/** A passage with the questions that belong to it, kept together. */
function blocksFrom(part: RawPart | undefined, kindOf: (id: string) => PassageBlock['kind']): PassageBlock[] {
  if (!part?.passages) return []
  return part.passages.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    kind: kindOf(p.id),
    items: part.items.filter((i) => i.passage === p.id),
  }))
}

const GRAMMAR_POOL = loosePool('R1', grammar.items as BankItem[])
const VOCAB_POOL = loosePool('R2', vocabulary.items as BankItem[])
const SHORT_POOL = loosePool('R5', shortTexts.items as BankItem[])

const COMPREHENSION_POOL: PassageBlock[] = [
  ...PAPERS.flatMap((paper) => {
    const part = partOf(paper, 'R3')
    return blocksFrom(part, (id) =>
      (part?.items ?? []).some((i) => i.passage === id && i.type === 'rightwrong')
        ? 'rightwrong'
        : 'mcq',
    )
  }),
  ...(comprehension.passages as { id: string; kind: string; title: string; body: string }[]).map(
    (p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      kind: p.kind as PassageBlock['kind'],
      items: (comprehension.items as BankItem[]).filter(
        (i) => (i as { passage?: string }).passage === p.id,
      ),
    }),
  ),
]

const GAPFILL_POOL: PassageBlock[] = [
  ...PAPERS.flatMap((paper) => blocksFrom(partOf(paper, 'R4'), () => 'mcq')),
  ...(gapfill.passages as { id: string; title: string; body: string }[]).map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    kind: 'mcq' as const,
    items: (gapfill.items as BankItem[]).filter(
      (i) => (i as { passage?: string }).passage === p.id,
    ),
  })),
]

/** Everything the pool holds, for the home screen to count honestly. */
export const BANK_SIZE =
  GRAMMAR_POOL.length +
  VOCAB_POOL.length +
  SHORT_POOL.length +
  COMPREHENSION_POOL.reduce((n, b) => n + b.items.length, 0) +
  GAPFILL_POOL.reduce((n, b) => n + b.items.length, 0)

/** Draw `count` distinct entries. Fisher-Yates on a copy: no repeats, no bias. */
function draw<T>(pool: readonly T[], count: number, rng: Rng): T[] {
  const copy = [...pool]
  const out: T[] = []
  for (let i = 0; i < count && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0])
  }
  return out
}

/**
 * Draw `count` questions while keeping the length pattern near chance.
 *
 * Every question in the pool is sound on its own, but a plain random ten can
 * still land six items whose answer happens to be the longest option — and
 * that is a paper a learner can pass by measuring instead of reading. So the
 * pool is split by that property and drawn from both sides in the proportion
 * chance would give.
 */
function drawByLength(
  pool: readonly BankItem[],
  count: number,
  optionCount: number,
  rng: Rng,
): BankItem[] {
  const isLongest = (item: BankItem) =>
    measureItem({ id: item.id, correct: item.correct, options: item.options })?.correctIsLongest ??
    false

  const longest = pool.filter(isLongest)
  const rest = pool.filter((i) => !isLongest(i))

  // What chance would produce, rounded, and never more than the guard allows.
  const target = Math.min(Math.round(count / optionCount), longest.length, count)

  const picked = [...draw(longest, target, rng), ...draw(rest, count - target, rng)]
  // Shuffle again so the two groups are not laid out in blocks.
  return draw(picked, picked.length, rng)
}

/**
 * Gap numbers are written into the passage text, so a block drawn into the
 * second half of the part has to be renumbered in both places at once.
 */
function renumber(block: PassageBlock, offset: number): PassageBlock {
  const ordered = [...block.items].sort((a, b) => (a.gapNumber ?? 0) - (b.gapNumber ?? 0))
  const map = new Map<number, number>()
  ordered.forEach((item, i) => map.set(item.gapNumber ?? i + 1, offset + i + 1))

  return {
    ...block,
    // One pass, so a 1→6 rewrite is never re-read as a 6 to rewrite again.
    body: block.body.replace(/\((\d+)\)/g, (whole, n) => {
      const next = map.get(Number(n))
      return next === undefined ? whole : `(${next})`
    }),
    items: ordered.map((item, i) => ({ ...item, gapNumber: offset + i + 1 })),
  }
}

function assemble(id: string, blocks: PassageBlock[], renumbered: boolean): RawPart {
  const used = renumbered ? blocks.map((b, i) => renumber(b, i * 5)) : blocks
  return {
    id,
    passages: used.map((b) => ({ id: b.id, title: b.title, body: b.body })),
    items: used.flatMap((b) => b.items.map((i) => ({ ...i, passage: b.id }))),
  }
}

const META: Record<string, { title: string; vi: string; instructions: string; lockOrder?: boolean }> = {
  R1: {
    title: 'Part 1 — Grammar',
    vi: 'Ngữ pháp: thì hiện tại, quá khứ đơn, so sánh',
    instructions: 'Choose the correct answer, A, B, C or D.',
  },
  R2: {
    title: 'Part 2 — Vocabulary',
    vi: 'Từ vựng B1',
    instructions: 'Choose the word or phrase that best completes each sentence.',
  },
  R3: {
    title: 'Part 3 — Reading comprehension',
    vi: 'Đọc hiểu: Đúng/Sai và chọn đáp án đúng nhất',
    instructions: 'Read the two texts and answer the questions.',
  },
  R4: {
    title: 'Part 4 — Gap fill',
    vi: 'Điền từ vào đoạn văn',
    instructions: 'Read the texts and choose the best word for each gap.',
    lockOrder: true,
  },
  R5: {
    title: 'Part 5 — Short texts',
    vi: 'Đọc thông báo, tin nhắn và chọn nghĩa đúng',
    instructions: 'Read each short text and choose the answer that says the same thing.',
  },
}

/**
 * One paper drawn from the pool. The same seed always gives the same paper, so
 * a sitting can be rebuilt on re-render without the questions changing under
 * the learner.
 */
export function buildBankPaper(seed: number): RawPaper {
  const rng = makeRng(seed)

  const rightWrong = draw(COMPREHENSION_POOL.filter((b) => b.kind === 'rightwrong'), 1, rng)
  const bestAnswer = draw(COMPREHENSION_POOL.filter((b) => b.kind === 'mcq'), 1, rng)

  const parts: RawPart[] = [
    { id: 'R1', items: drawByLength(GRAMMAR_POOL, 10, 4, rng) },
    { id: 'R2', items: drawByLength(VOCAB_POOL, 10, 4, rng) },
    assemble('R3', [...rightWrong, ...bestAnswer], false),
    assemble('R4', draw(GAPFILL_POOL, 2, rng), true),
    { id: 'R5', items: drawByLength(SHORT_POOL, 10, 3, rng) },
  ]

  return {
    sectionId: 'reading',
    title: 'Reading, Grammar & Vocabulary',
    label: 'Đề bốc từ kho',
    durationSeconds: 3600,
    // Spreading the key evenly matters more here than in a hand-written paper:
    // a random ten could easily land on the same letter six times.
    parts: parts.map((p) => ({ ...META[p.id], ...balanceAnswerKeys(p) })),
  } as unknown as RawPaper
}
