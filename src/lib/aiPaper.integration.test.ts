import { describe, it, expect } from 'vitest'
import { generateReadingPaper } from './aiPaper'
import { buildPaper, readingPapers, type RawPaper } from './paper'
import { reportPart } from './paperQuality'
import { writeFileSync } from 'node:fs'

/**
 * Calls Gemini for real and checks that what comes back is the paper the
 * revision document describes.
 *
 * Skipped unless GEMINI_KEY is in the environment, so it never runs in CI and
 * the key never has to live in the repo:
 *
 *   GEMINI_KEY=... npx vitest run src/lib/aiPaper.integration.test.ts
 *
 * The point is not that the model is clever. It is that a paper it wrote is
 * indistinguishable in SHAPE from the built-in ones: same parts, same counts,
 * same answer formats, same syllabus. Anything it gets wrong here is a prompt
 * bug, and the assertions below are written to say which.
 */

const KEY = process.env.GEMINI_KEY ?? ''

/** Trang 27 của tài liệu: 50 câu = 20 từ vựng/ngữ pháp + 10 đọc hiểu + 10 điền từ + 10 đọc ngắn. */
const DOCUMENT_SHAPE = [
  { id: 'R1', items: 10, options: 4, rightWrong: 0, passages: 0 },
  { id: 'R2', items: 10, options: 4, rightWrong: 0, passages: 0 },
  { id: 'R3', items: 10, options: 4, rightWrong: 5, passages: 2 },
  { id: 'R4', items: 10, options: 4, rightWrong: 0, passages: 2 },
  { id: 'R5', items: 10, options: 3, rightWrong: 0, passages: 0 },
]

/** Sáu bộ từ tài liệu chỉ định (trang 27, mục 2). */
const WORD_SETS = [
  'lazy', 'active', 'kind', 'popular', 'funny', 'polite', 'friendly', 'quiet', 'helpful',
  'creative', 'map', 'tourists', 'guidebook', 'suitcase', 'guests', 'luggage', 'receptionist',
  'visitors', 'fridge', 'washing machine', 'air conditioning', 'bookcase', 'roof', 'barbecue',
  'stairs', 'drawer', 'lights', 'seat', 'heating', 'bin', 'careless', 'miserable', 'confident',
  'brilliant', 'spend', 'fantastic', 'enjoy', 'glad', 'make', 'made', 'makes', 'have', 'has',
  'had', 'do', 'does', 'did', 'done', 'be', 'annoyed', 'argument', 'problems', 'favour',
  'friends', 'fun', 'common', 'own', 'time',
]

/** Ngoài phạm vi ngữ pháp: nếu đáp án đúng là một trong các dạng này thì đề sai. */
const OUT_OF_SCOPE = [
  { name: 'present perfect', re: /\b(?:have|has)\s+(?:been|got|gone|done|seen|made|taken)\b/i },
  { name: 'future', re: /\b(?:will|shall|going to)\b/i },
  { name: 'passive', re: /\b(?:is|are|was|were)\s+\w+ed\s+by\b/i },
  { name: 'conditional', re: /\bwould\s+\w+/i },
]

describe.skipIf(!KEY)('đề AI so với cấu trúc trong tài liệu', () => {
  let paper: ReturnType<typeof buildPaper>
  let raw: Awaited<ReturnType<typeof generateReadingPaper>>

  it(
    'sinh được một đề hoàn chỉnh',
    async () => {
      raw = await generateReadingPaper({ key: KEY, tag: 'TEST_' })
      paper = buildPaper(raw as unknown as RawPaper)
      // Shape checks cannot tell whether an answer is actually right. Set
      // DUMP_TO to write the paper out and read it like a proof-reader would.
      if (process.env.DUMP_TO) {
        writeFileSync(process.env.DUMP_TO, JSON.stringify(raw, null, 2), 'utf8')
      }
      expect(paper.questions).toHaveLength(50)
    },
    240_000,
  )

  it('có đúng năm phần, đúng số câu như tài liệu mô tả', () => {
    const parts = raw.parts as { id: string; items: unknown[]; passages?: unknown[] }[]
    expect(parts.map((p) => p.id)).toEqual(DOCUMENT_SHAPE.map((s) => s.id))
    for (const spec of DOCUMENT_SHAPE) {
      const part = parts.find((p) => p.id === spec.id)!
      expect(part.items.length, `${spec.id}: số câu`).toBe(spec.items)
      expect(part.passages?.length ?? 0, `${spec.id}: số đoạn văn`).toBe(spec.passages)
    }
  })

  it('dùng đúng tiêu đề và câu lệnh của đề trong tài liệu', () => {
    // Đề AI phải trông y hệt đề có sẵn: cùng tên phần, cùng câu lệnh tiếng Anh.
    const builtIn = readingPapers[0]
    for (const spec of DOCUMENT_SHAPE) {
      const mine = builtIn.questions.find((q) => q.partId === spec.id)!
      const theirs = paper.questions.find((q) => q.partId === spec.id)!
      expect(theirs.partTitle, `${spec.id}: tiêu đề`).toBe(mine.partTitle)
      expect(theirs.partVi, `${spec.id}: mô tả tiếng Việt`).toBe(mine.partVi)
      expect(theirs.instructions, `${spec.id}: câu lệnh`).toBe(mine.instructions)
    }
  })

  it('mỗi câu có đúng số phương án mà dạng bài đó yêu cầu', () => {
    for (const spec of DOCUMENT_SHAPE) {
      const qs = paper.questions.filter((q) => q.partId === spec.id)
      const rw = qs.filter((q) => q.kind === 'rightwrong')
      expect(rw.length, `${spec.id}: số câu Right/Wrong`).toBe(spec.rightWrong)
      for (const q of qs.filter((x) => x.kind !== 'rightwrong')) {
        expect(q.options.length, `${q.id}: số phương án`).toBe(spec.options)
      }
    }
  })

  it('đáp án của mọi câu đều nằm trong chính các phương án của câu đó', () => {
    const bad = paper.questions
      .filter((q) => !q.options.some((o) => o.key === q.correct))
      .map((q) => `${q.id} (đáp án ${q.correct})`)
    expect(bad).toEqual([])
  })

  it('câu hỏi và đoạn văn không để trống', () => {
    const empty = paper.questions
      .filter((q) => {
        if (q.kind === 'gap' || q.partId === 'R4') return false
        return !(q.prompt ?? '').trim()
      })
      .map((q) => q.id)
    expect(empty).toEqual([])

    const passages = paper.questions.filter((q) => q.passage)
    for (const q of passages) {
      expect((q.passage!.body ?? '').split(/\s+/).length, `${q.id}: đoạn văn`).toBeGreaterThan(60)
    }
  })

  it('phần từ vựng chỉ lấy đáp án trong sáu bộ từ của tài liệu', () => {
    const outside = paper.questions
      .filter((q) => q.partId === 'R2')
      .filter((q) => {
        const right = (q.options.find((o) => o.key === q.correct)?.text ?? '').toLowerCase().trim()
        return !WORD_SETS.some((w) => right === w || right.includes(w))
      })
      .map((q) => `${q.id}: "${q.options.find((o) => o.key === q.correct)?.text}"`)
    expect(outside).toEqual([])
  })

  it('phần ngữ pháp không ra ngoài bốn điểm được phép', () => {
    const strays: string[] = []
    for (const q of paper.questions.filter((x) => x.partId === 'R1')) {
      const right = q.options.find((o) => o.key === q.correct)?.text ?? ''
      for (const rule of OUT_OF_SCOPE) {
        if (rule.re.test(right)) strays.push(`${q.id}: đáp án "${right}" là ${rule.name}`)
      }
    }
    expect(strays).toEqual([])
  })

  it('giải thích viết tiếng Việt và không gọi tên phương án bằng chữ cái', () => {
    const named = /(?:phương án|đáp án)\s+[A-D]\b|(?:^|[\s"“(])[A-D]\s+(?:sai|đúng|là bẫy)/
    const problems: string[] = []
    for (const q of paper.questions) {
      const e = (q.explain ?? '').trim()
      if (e.length < 20) problems.push(`${q.id}: giải thích quá ngắn`)
      if (named.test(e)) problems.push(`${q.id}: gọi tên phương án bằng chữ cái`)
      if (!/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(e)) {
        problems.push(`${q.id}: giải thích không phải tiếng Việt`)
      }
    }
    expect(problems).toEqual([])
  })

  it('không đoán được bằng độ dài, không bỏ trống chữ cái nào', () => {
    const parts = raw.parts as { id: string; items: never[] }[]
    const problems: string[] = []
    for (const part of parts) {
      const r = reportPart({ id: part.id, items: part.items })
      if (!r) continue
      if (r.longestWins > r.allowedLongestWins) {
        problems.push(`${r.partId}: đáp án là câu dài nhất ở ${r.longestWins}/${r.scored} câu`)
      }
      if (r.unusedKeys.length) {
        problems.push(`${r.partId}: chữ cái không bao giờ đúng — ${r.unusedKeys.join(', ')}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('chỗ trống trong đoạn điền từ khớp với số thứ tự câu hỏi', () => {
    const gapPart = (raw.parts as { id: string; items: { gapNumber?: number }[]; passages?: { body: string }[] }[])
      .find((p) => p.id === 'R4')!
    const printed = (gapPart.passages ?? [])
      .flatMap((p) => [...p.body.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])))
      .sort((a, b) => a - b)
    const asked = gapPart.items.map((i) => i.gapNumber!).sort((a, b) => a - b)
    expect(printed).toEqual(asked)
  })
})
