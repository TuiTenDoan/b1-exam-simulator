import listeningRaw from '../data/listening.json'
import readingRaw from '../data/reading.json'
import reading2Raw from '../data/reading2.json'
import type { AnswerKeyEntry } from '../domain/types'
import { makeRng, shuffleOptions, shuffleWithinGroups } from '../domain/shuffle'

export type QuestionKind = 'mcq' | 'rightwrong' | 'gap' | 'art'

export interface Option {
  key: string
  text?: string
  art?: string
}

export interface FlatQuestion {
  id: string
  /** 1-based position on the whole paper. */
  number: number
  partId: string
  partTitle: string
  partVi: string
  instructions?: string
  prompt: string
  kind: QuestionKind
  options: Option[]
  correct: string
  accepts?: string[]
  explain?: string
  /** Basename of the mp3 in /audio, when this question has a recording. */
  audio?: string
  passage?: { title: string; body: string }
  passageId?: string
  /** Set where the printed order carries meaning — numbered gaps, sequential notes. */
  lockOrder?: boolean
  notice?: string
  noteTitle?: string
}

export interface Paper {
  sectionId: string
  title: string
  /** Shown in the paper picker: "Đề 1", "Đề 2"… */
  label: string
  durationSeconds: number
  questions: FlatQuestion[]
  answerKey: AnswerKeyEntry[]
}

const RIGHT_WRONG: Option[] = [
  { key: 'A', text: 'RIGHT — Đúng' },
  { key: 'B', text: 'WRONG — Sai' },
]

type RawOption = { key: string; text?: string; art?: string }
type RawItem = {
  id: string
  prompt: string
  type?: string
  options?: RawOption[]
  correct: string
  accepts?: string[]
  explain?: string
  script?: unknown
  passage?: string
  notice?: string
  gapNumber?: number
}
type RawPassage = { id: string; title: string; body: string }
type RawPart = {
  id: string
  title: string
  vi: string
  instructions?: string
  sharedAudio?: string
  noteTitle?: string
  lockOrder?: boolean
  passages?: RawPassage[]
  items: RawItem[]
}
type RawPaper = {
  sectionId: string
  title: string
  label?: string
  durationSeconds: number
  parts: RawPart[]
}

function buildPaper(raw: RawPaper): Paper {
  const questions: FlatQuestion[] = []

  for (const part of raw.parts) {
    const passages = new Map((part.passages ?? []).map((p) => [p.id, p]))

    for (const item of part.items) {
      const isGap = item.type === 'gap'
      const isRightWrong = item.type === 'rightwrong'
      const hasArt = Boolean(item.options?.some((o) => o.art))

      const kind: QuestionKind = isGap
        ? 'gap'
        : isRightWrong
          ? 'rightwrong'
          : hasArt
            ? 'art'
            : 'mcq'

      const passage = item.passage ? passages.get(item.passage) : undefined

      questions.push({
        id: item.id,
        number: questions.length + 1,
        partId: part.id,
        partTitle: part.title,
        partVi: part.vi,
        instructions: part.instructions,
        prompt: item.prompt,
        kind,
        options: isRightWrong ? RIGHT_WRONG : (item.options ?? []),
        correct: item.correct,
        accepts: item.accepts,
        explain: item.explain,
        audio: item.script ? item.id : part.sharedAudio,
        passage: passage ? { title: passage.title, body: passage.body } : undefined,
        passageId: item.passage,
        lockOrder: part.lockOrder,
        notice: item.notice,
        noteTitle: part.noteTitle,
      })
    }
  }

  return {
    sectionId: raw.sectionId,
    title: raw.title,
    label: raw.label ?? 'Đề 1',
    durationSeconds: raw.durationSeconds,
    questions,
    answerKey: questions.map((q) => ({
      id: q.id,
      correct: q.correct,
      accepts: q.accepts,
    })),
  }
}

/**
 * Every paper of a section, in the order they are offered. More than one paper
 * is the whole point: a single fixed paper gets memorised, and a memorised
 * paper stops measuring English.
 */
export const listeningPapers: Paper[] = [listeningRaw].map((raw) =>
  buildPaper(raw as RawPaper),
)
export const readingPapers: Paper[] = [readingRaw, reading2Raw].map((raw) =>
  buildPaper(raw as RawPaper),
)

export const listeningPaper = listeningPapers[0]
export const readingPaper = readingPapers[0]

export function papersFor(sectionId: string): Paper[] {
  return sectionId === 'listening' ? listeningPapers : readingPapers
}

/** An index the data no longer has — a removed paper, a stale setting — falls back to the first. */
export function paperFor(sectionId: string, index = 0): Paper {
  const papers = papersFor(sectionId)
  return papers[index] ?? papers[0]
}

/**
 * A question keeps its place when its printed order matters; otherwise it may
 * move within its own part, and within its own passage where it has one.
 * Locked questions get a group of their own, which makes shuffling a no-op.
 */
function groupKey(q: FlatQuestion): string {
  if (q.lockOrder) return `${q.partId}/locked/${q.id}`
  return `${q.partId}/${q.passageId ?? ''}`
}

/**
 * One sitting of a paper. With `shuffle` on, question order and answer options
 * are both randomised from `seed`, so the same paper can be resat without the
 * answers being memorable by position.
 */
export function buildAttempt(
  paper: Paper,
  { shuffle, seed }: { shuffle: boolean; seed: number },
): Paper {
  if (!shuffle) return paper

  const rng = makeRng(seed)
  const ordered = shuffleWithinGroups(paper.questions, groupKey, rng)
  const questions = ordered.map((q, i) => ({
    ...shuffleOptions(q, rng),
    number: i + 1,
  }))

  return {
    ...paper,
    questions,
    answerKey: questions.map((q) => ({
      id: q.id,
      correct: q.correct,
      accepts: q.accepts,
    })),
  }
}
