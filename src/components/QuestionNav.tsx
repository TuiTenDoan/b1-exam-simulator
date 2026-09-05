import { useEffect, useRef } from 'react'
import type { FlatQuestion } from '../lib/paper'
import type { GradedQuestion } from '../domain/types'

type Props = {
  questions: FlatQuestion[]
  answers: Record<string, string>
  flags: readonly string[]
  current: number
  onJump: (index: number) => void
  /** Present once the paper is marked; switches the strip to review colours. */
  graded?: GradedQuestion[]
}

/** "Part 1 — Picture description" → "Part 1", so the strip stays scannable. */
function shortLabel(q: FlatQuestion): string {
  return q.partTitle.match(/Part\s*\d+/i)?.[0] ?? q.partId
}

/**
 * The bottom strip from a computer-delivered exam: every question number on
 * screen at once, grouped by part, showing at a glance what is answered, what
 * is flagged, and where you are.
 */
export function QuestionNav({ questions, answers, flags, current, onJump, graded }: Props) {
  const gradedById = new Map((graded ?? []).map((g) => [g.id, g]))
  const flagged = new Set(flags)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const hereRef = useRef<HTMLButtonElement | null>(null)

  // 50 numbers do not fit on one row, so keep the active one in view rather
  // than leaving the later parts stranded off-screen.
  useEffect(() => {
    const strip = stripRef.current
    const btn = hereRef.current
    if (!strip || !btn) return

    const s = strip.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    if (b.left < s.left + 8 || b.right > s.right - 8) {
      strip.scrollBy({ left: b.left - s.left - s.width / 2 + b.width / 2, behavior: 'smooth' })
    }
  }, [current])

  const parts: { label: string; items: FlatQuestion[] }[] = []
  for (const q of questions) {
    const label = shortLabel(q)
    const last = parts[parts.length - 1]
    if (last && last.label === label) last.items.push(q)
    else parts.push({ label, items: [q] })
  }

  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length

  return (
    <nav className="qnav" aria-label="Chuyển câu hỏi">
      <div className="qnav__parts" ref={stripRef}>
        {parts.map((part) => (
          <div className="qnavPart" key={part.label + part.items[0].id}>
            <span className="qnavPart__label">{part.label}</span>
            <div className="qnavPart__nums">
              {part.items.map((q) => {
                const i = questions.indexOf(q)
                const given = answers[q.id]?.trim()
                const mark = gradedById.get(q.id)

                let cls = 'qnum'
                if (mark) cls += mark.isCorrect ? ' qnum--ok' : ' qnum--no'
                else if (given) cls += ' qnum--done'
                if (flagged.has(q.id)) cls += ' qnum--flag'
                if (i === current) cls += ' qnum--here'

                return (
                  <button
                    key={q.id}
                    ref={i === current ? hereRef : undefined}
                    className={cls}
                    onClick={() => onJump(i)}
                    aria-current={i === current ? 'true' : undefined}
                    aria-label={`Câu ${q.number}${given ? ', đã trả lời' : ', chưa trả lời'}${
                      flagged.has(q.id) ? ', đã đánh dấu' : ''
                    }`}
                  >
                    {q.number}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="qnav__count mono" aria-live="polite">
        {answeredCount}/{questions.length}
      </div>
    </nav>
  )
}
