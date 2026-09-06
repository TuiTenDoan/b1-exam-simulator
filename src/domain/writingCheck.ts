/**
 * Machine-checkable parts of the writing paper.
 *
 * This grades form, never quality. It can tell whether a sentence uses the
 * structure its prompt is testing, and whether an essay is the right length
 * and shape. It cannot tell whether the ideas are any good, so the marks that
 * depend on judgement are reported as unscored rather than invented.
 */

export type SentenceRule = 'any' | 'future' | 'no-will' | 'would'

export type SentenceVerdict =
  | 'ok'
  | 'empty'
  | 'too-short'
  | 'repeat'
  | 'missing-future'
  | 'will-in-time-clause'
  | 'missing-would'

export interface SentenceResult {
  verdict: SentenceVerdict
  /** Vietnamese explanation shown next to the answer. */
  message: string
  /** Marks earned out of 0.5 for this item. */
  mark: number
}

const FUTURE = /\b(will|shall)\b|'ll\b|\bgoing to\b/i
const WILL = /\bwill\b|'ll\b/i
const MODAL = /\b(would|could|might)\b|'d\b/i

function words(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean)
}

function flatten(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkSentence(
  answer: string,
  item: { stem: string; rule: SentenceRule },
): SentenceResult {
  if (answer.trim() === '') {
    return { verdict: 'empty', message: 'Chưa viết gì.', mark: 0 }
  }

  if (words(answer).length < 2) {
    return {
      verdict: 'too-short',
      message: 'Quá ngắn — cần một mệnh đề có chủ ngữ và động từ.',
      mark: 0,
    }
  }

  const a = flatten(answer)
  const stem = flatten(item.stem)
  if (a === stem || a.startsWith(stem)) {
    return {
      verdict: 'repeat',
      message: 'Đây là chép lại đề, chưa phải phần viết tiếp.',
      mark: 0,
    }
  }

  if (item.rule === 'future' && !FUTURE.test(answer)) {
    return {
      verdict: 'missing-future',
      message: 'Mệnh đề chính cần thì tương lai: will / ’ll / be going to.',
      mark: 0.25,
    }
  }

  if (item.rule === 'no-will' && WILL.test(answer)) {
    return {
      verdict: 'will-in-time-clause',
      message: 'Sau until / as soon as / whenever thì dùng hiện tại đơn, không dùng will.',
      mark: 0.25,
    }
  }

  if (item.rule === 'would' && !MODAL.test(answer)) {
    return {
      verdict: 'missing-would',
      message: 'Câu điều kiện loại 2 cần would / could / might + động từ nguyên thể.',
      mark: 0.25,
    }
  }

  return { verdict: 'ok', message: 'Đúng cấu trúc đề yêu cầu.', mark: 0.5 }
}

/* ------------------------------------------------------------------ */

export interface EssayCheck {
  id: 'length' | 'paragraphs' | 'linkers' | 'onTopic'
  label: string
  detail: string
  pass: boolean
  mark: number
}

export interface EssayResult {
  words: number
  paragraphs: number
  checks: EssayCheck[]
  /** Marks earned on the checkable criteria. */
  autoScore: number
  /** Ceiling of what this function is willing to judge. */
  maxAutoScore: number
  /** Marks deliberately left for a human reader. */
  humanMarks: number
}

const MIN_WORDS = 120
const MAX_WORDS = 180
const TOTAL_MARKS = 6

const LINKERS = [
  'first', 'firstly', 'second', 'secondly', 'third', 'thirdly',
  'moreover', 'furthermore', 'in addition', 'however', 'therefore',
  'finally', 'lastly', 'to conclude', 'in conclusion', 'for example',
  'as a result', 'on the other hand',
]

export function analyseEssay(text: string, topic: { keywords: string[] }): EssayResult {
  const wordCount = words(text).length
  const paragraphCount = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length

  const lower = ` ${flatten(text)} `
  const linkersFound = LINKERS.filter((l) => lower.includes(` ${l} `))
  const keywordsFound = topic.keywords.filter((k) => lower.includes(flatten(k)))

  const checks: EssayCheck[] = [
    {
      id: 'length',
      label: `Độ dài ${MIN_WORDS}–${MAX_WORDS} từ`,
      detail: `Bài của bạn ${wordCount} từ.`,
      pass: wordCount >= MIN_WORDS && wordCount <= MAX_WORDS,
      mark: 1,
    },
    {
      id: 'paragraphs',
      label: 'Đủ 4 đoạn: mở, hai thân, kết',
      detail: `Đếm được ${paragraphCount} đoạn (cách nhau bằng một dòng trống).`,
      pass: paragraphCount >= 4,
      mark: 1,
    },
    {
      id: 'linkers',
      label: 'Có từ nối dẫn dắt',
      detail: linkersFound.length
        ? `Tìm thấy: ${linkersFound.slice(0, 5).join(', ')}.`
        : 'Chưa thấy từ nối nào như First, Second, Moreover, To conclude.',
      pass: linkersFound.length >= 2,
      mark: 1,
    },
    {
      id: 'onTopic',
      label: 'Bám từ khoá của đề',
      detail: keywordsFound.length
        ? `Có nhắc: ${keywordsFound.join(', ')}.`
        : 'Chưa nhắc lại từ khoá nào của đề bài.',
      pass: keywordsFound.length >= 2,
      mark: 1,
    },
  ]

  const maxAutoScore = checks.reduce((n, c) => n + c.mark, 0)

  return {
    words: wordCount,
    paragraphs: paragraphCount,
    checks,
    autoScore: checks.reduce((n, c) => n + (c.pass ? c.mark : 0), 0),
    maxAutoScore,
    humanMarks: TOTAL_MARKS - maxAutoScore,
  }
}
