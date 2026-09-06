/**
 * Reading a language model's reply as a mark.
 *
 * The model is asked for JSON, but a model can always answer with something
 * else — a refusal, a truncated object, a score of 12 out of 3. Everything the
 * page renders goes through here first, so a strange reply degrades into an
 * empty mark rather than into broken UI or an invented score.
 */

export interface AiError {
  wrong: string
  fix: string
  why: string
}

export interface AiMark {
  /** Ideas and task response, 0–3. */
  ideas: number
  /** Language accuracy and range, 0–3. */
  language: number
  /** ideas + language, 0–6. */
  total: number
  comment: string
  errors: AiError[]
}

const BAND_MAX = 3
const MAX_ERRORS = 8

function score(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.min(Math.max(n, 0), BAND_MAX) * 10) / 10
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function parseAiMark(raw: unknown): AiMark {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Model không trả về JSON như yêu cầu.')
  }

  const o = raw as Record<string, unknown>
  const ideas = score(o.ideas)
  const language = score(o.language)

  const errors: AiError[] = (Array.isArray(o.errors) ? o.errors : [])
    .map((e) => {
      const item = (e ?? {}) as Record<string, unknown>
      return { wrong: text(item.wrong), fix: text(item.fix), why: text(item.why_vi ?? item.why) }
    })
    // An entry is only useful if it shows the mistake and the correction.
    .filter((e) => e.wrong !== '' && e.fix !== '')
    .slice(0, MAX_ERRORS)

  return {
    ideas,
    language,
    total: Math.round((ideas + language) * 10) / 10,
    comment: text(o.comment_vi ?? o.comment),
    errors,
  }
}
