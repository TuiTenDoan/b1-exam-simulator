export type QuestionId = string

/** One row of an answer key. `correct` is a letter for MCQ, or the text for gap-fill. */
export interface AnswerKeyEntry {
  id: QuestionId
  correct: string
  /** Extra spellings accepted for gap-fill answers. */
  accepts?: string[]
}

export interface GradedQuestion {
  id: QuestionId
  given: string | null
  correct: string
  answered: boolean
  isCorrect: boolean
}

export interface SectionResult {
  total: number
  answered: number
  correct: number
  /** Score on the Vietnamese 10-point scale, rounded to 2 decimals. */
  score10: number
  /** True when score10 reaches the 5.0 pass mark. */
  passed: boolean
  questions: GradedQuestion[]
}
