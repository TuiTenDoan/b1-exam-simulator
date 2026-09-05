import type { QuestionId } from './types'

export interface Session {
  /** Question ids in paper order. */
  readonly ids: readonly QuestionId[]
  /** Cursor into `ids`. */
  readonly index: number
  readonly answers: Readonly<Record<QuestionId, string>>
  readonly answeredCount: number
  /** Questions marked to come back to, in the order they were flagged. */
  readonly flags: readonly QuestionId[]
}

function clamp(index: number, length: number): number {
  if (length === 0) return 0
  return Math.min(Math.max(index, 0), length - 1)
}

function withIndex(session: Session, index: number): Session {
  return { ...session, index: clamp(index, session.ids.length) }
}

export function createSession(ids: readonly QuestionId[]): Session {
  return { ids, index: 0, answers: {}, answeredCount: 0, flags: [] }
}

/** Mark a question to revisit, or clear the mark. Independent of answering it. */
export function toggleFlag(session: Session, id: QuestionId): Session {
  const flags = session.flags.includes(id)
    ? session.flags.filter((f) => f !== id)
    : [...session.flags, id]
  return { ...session, flags }
}

/** Record a response. Blank input clears the answer so the count stays honest. */
export function answer(session: Session, id: QuestionId, value: string): Session {
  const answers = { ...session.answers }
  if (value.trim() === '') {
    delete answers[id]
  } else {
    answers[id] = value
  }
  return { ...session, answers, answeredCount: Object.keys(answers).length }
}

export function goTo(session: Session, index: number): Session {
  return withIndex(session, index)
}

export function next(session: Session): Session {
  return withIndex(session, session.index + 1)
}

export function prev(session: Session): Session {
  return withIndex(session, session.index - 1)
}
