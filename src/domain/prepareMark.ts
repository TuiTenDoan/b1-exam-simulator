/**
 * Marking for the Cambridge Prepare practice boards (listening and reading).
 *
 * This lives outside the screen component so the answer keys can be tested
 * without rendering anything. The exercises come from the user's own textbook
 * and several keys were derived by reading the page rather than copied from a
 * printed answer list, so a silent mistake here is the worst failure this app
 * has: it would teach the wrong answer.
 */

export type PrepareGroupType = 'mcq3' | 'rw' | 'gap' | 'tick' | 'pick'

export interface PrepareGroup {
  type: PrepareGroupType
  label?: string
  /** Number printed next to the first question of the group. Defaults to 1. */
  from?: number
  /** Tick-box list, or the shared choices of a `pick` group. */
  options?: string[]
  /** Display text for `options`, in the same order. Defaults to the option. */
  labels?: string[]
  /** Per-question choices, for a `pick` group where every item differs. */
  rows?: string[][]
  answers: string[]
  /** Extra spellings accepted for a `gap`, one list per question. */
  accepts?: string[][]
}

export interface PrepareTask {
  id: string
  /** Absent on a reading task — there is nothing to play. */
  audio?: string
  /** One or more sheet images; a passage and its questions are often split. */
  images: string[]
  part: string
  title: string
  vi: string
  /** Where in the textbook this exercise comes from. */
  source?: string
  /**
   * 'doc' — the answer key is typed out in the revision document.
   * 'derived' — the document printed the exercise without its answers, so the
   * key below was worked out from the page and should be double-checked.
   */
  origin?: 'doc' | 'derived'
  groups: PrepareGroup[]
}

export interface PrepareBoard {
  sectionId: string
  title: string
  note: string
  /** Folder under public/ holding the sheet images, e.g. 'prepare/rq'. */
  imageDir: string
  /** Folder holding the recordings. Absent on a reading board. */
  audioDir?: string
  tasks: PrepareTask[]
}

/**
 * Answers are compared loosely: the exercise tests the word, not the typing.
 * Hyphens count as spaces so "air-conditioning" passes, and a leading £ is
 * dropped because the listening sheets print the sign outside the gap.
 */
export function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^£/, '')
    .trim()
}

export function isCorrect(group: PrepareGroup, i: number, given: string): boolean {
  if (!given?.trim()) return false
  if (group.type === 'gap') {
    const accepted = [group.answers[i], ...(group.accepts?.[i] ?? [])]
    return accepted.some((a) => normalise(a) === normalise(given))
  }
  return given === group.answers[i]
}

/** The choices offered for one question of a `pick` group. */
export function choicesFor(group: PrepareGroup, i: number): { key: string; label: string }[] {
  const keys = group.rows?.[i] ?? group.options ?? []
  return keys.map((key, k) => ({
    key,
    label: (group.rows ? undefined : group.labels?.[k]) ?? key,
  }))
}

/** A tick group is one mark for the whole set, not one per box. */
export function groupItemCount(group: PrepareGroup): number {
  return group.type === 'tick' ? 1 : group.answers.length
}

export function taskQuestionCount(task: PrepareTask): number {
  return task.groups.reduce((n, g) => n + groupItemCount(g), 0)
}

export function answerKey(taskId: string, gi: number, suffix: string | number): string {
  return `${taskId}.${gi}.${suffix}`
}

/** True when every box in a tick group matches the key and at least one is on. */
export function tickIsCorrect(
  taskId: string,
  gi: number,
  group: PrepareGroup,
  answers: Record<string, string>,
): boolean {
  const options = group.options ?? []
  const touched = options.some((opt) => answers[answerKey(taskId, gi, opt)] === 'on')
  const allMatch = options.every(
    (opt) => (answers[answerKey(taskId, gi, opt)] === 'on') === group.answers.includes(opt),
  )
  return touched && allMatch
}

export function scoreBoard(
  tasks: readonly PrepareTask[],
  answers: Record<string, string>,
): { total: number; correct: number } {
  let total = 0
  let correct = 0

  for (const task of tasks) {
    task.groups.forEach((group, gi) => {
      if (group.type === 'tick') {
        total += 1
        if (tickIsCorrect(task.id, gi, group, answers)) correct += 1
        return
      }
      const from = group.from ?? 1
      group.answers.forEach((_, i) => {
        total += 1
        if (isCorrect(group, i, answers[answerKey(task.id, gi, from + i)] ?? '')) correct += 1
      })
    })
  }

  return { total, correct }
}
