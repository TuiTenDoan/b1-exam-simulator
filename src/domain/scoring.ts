import type { AnswerKeyEntry, QuestionId, SectionResult } from './types'

/** A section is a pass at 5.0 on the Vietnamese 10-point scale. */
export const PASS_MARK = 5

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Fold case, trim, and collapse runs of whitespace so typing slips don't cost marks. */
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matches(entry: AnswerKeyEntry, given: string): boolean {
  const candidates = [entry.correct, ...(entry.accepts ?? [])]
  return candidates.some((c) => normalise(c) === normalise(given))
}

export function gradeSection(
  key: AnswerKeyEntry[],
  answers: Record<QuestionId, string>,
): SectionResult {
  const questions = key.map((entry) => {
    const given = answers[entry.id] ?? null
    return {
      id: entry.id,
      given,
      correct: entry.correct,
      answered: given !== null && given.trim() !== '',
      isCorrect: given !== null && matches(entry, given),
    }
  })

  const correct = questions.filter((q) => q.isCorrect).length
  const score10 = key.length === 0 ? 0 : round2((correct / key.length) * 10)

  return {
    total: key.length,
    answered: questions.filter((q) => q.answered).length,
    correct,
    score10,
    passed: score10 >= PASS_MARK,
    questions,
  }
}
