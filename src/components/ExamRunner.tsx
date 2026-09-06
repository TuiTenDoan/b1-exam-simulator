import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPlayer } from './AudioPlayer'
import { QuestionNav } from './QuestionNav'
import { Scene } from '../art/Scene'
import { ExamResults } from './ExamResults'
import { answer, createSession, goTo, next, prev, toggleFlag } from '../domain/examSession'
import { gradeSection } from '../domain/scoring'
import { formatClock, phaseFor, remainingAt } from '../domain/timer'
import type { SectionResult } from '../domain/types'
import { buildAttempt, type FlatQuestion, type Paper } from '../lib/paper'

type Props = {
  paper: Paper
  /** Recordings may be played twice in the real exam. */
  maxPlays?: number
  /** Randomise question order and answer options for this sitting. */
  shuffle: boolean
  onExit: () => void
  onFinished: (sectionId: string, result: SectionResult) => void
}

/**
 * One screenful of the paper: a part, split further by passage so a reading
 * text is never shown next to questions about a different text.
 */
function screenKey(q: FlatQuestion): string {
  return `${q.partId}/${q.passageId ?? ''}`
}

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21V4a1 1 0 0 1 1-1h10.5l-1.5 4 1.5 4H6" />
    </svg>
  )
}

function ClockPill({ seconds }: { seconds: number }) {
  const phase = phaseFor(seconds)
  const cls =
    phase === 'critical' ? ' clock--critical' : phase === 'warning' ? ' clock--warning' : ''
  return (
    <span className={`clock${cls}`} role="timer" aria-live="off">
      <span className="clock__dot" />
      {formatClock(seconds)}
    </span>
  )
}

function QuestionBody({
  q,
  given,
  onAnswer,
  locked,
}: {
  q: FlatQuestion
  given: string | undefined
  onAnswer: (value: string) => void
  locked: boolean
}) {
  if (q.kind === 'gap') {
    return (
      <input
        className="gapInput"
        value={given ?? ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Nhập một từ hoặc một số…"
        autoComplete="off"
        spellCheck={false}
        disabled={locked}
        aria-label={`Câu ${q.number}`}
      />
    )
  }

  if (q.kind === 'art') {
    return (
      <div className="options options--art" role="radiogroup" aria-label={`Câu ${q.number}`}>
        {q.options.map((o) => (
          <button
            key={o.key}
            className={`optArt${given === o.key ? ' optArt--on' : ''}`}
            onClick={() => onAnswer(o.key)}
            disabled={locked}
            role="radio"
            aria-checked={given === o.key}
          >
            <Scene spec={o.art ?? ''} />
            <span className="opt__key">{o.key}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="options" role="radiogroup" aria-label={`Câu ${q.number}`}>
      {q.options.map((o) => (
        <button
          key={o.key}
          className={`opt${given === o.key ? ' opt--on' : ''}`}
          onClick={() => onAnswer(o.key)}
          disabled={locked}
          role="radio"
          aria-checked={given === o.key}
        >
          <span className="opt__key">{o.key}</span>
          <span className="opt__text">{o.text}</span>
        </button>
      ))}
    </div>
  )
}

/** One sitting. Remounted on retry, which resets the clock, the answers and the shuffle. */
function Attempt({
  attempt,
  maxPlays,
  shuffled,
  onExit,
  onRetry,
  onFinished,
}: {
  attempt: Paper
  maxPlays: number
  shuffled: boolean
  onExit: () => void
  onRetry: () => void
  onFinished: (sectionId: string, result: SectionResult) => void
}) {
  const ids = useMemo(() => attempt.questions.map((q) => q.id), [attempt])
  const [session, setSession] = useState(() => createSession(ids))
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [result, setResult] = useState<SectionResult | null>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  const remaining = remainingAt(startedAt, attempt.durationSeconds, now)
  const submitted = result !== null

  const current = attempt.questions[session.index]
  const visible = useMemo(
    () => attempt.questions.filter((q) => screenKey(q) === screenKey(current)),
    [attempt, current],
  )

  // Parts like the gap-fill notes share one recording; play it once at the top
  // rather than repeating a player above every question.
  const sharedAudio =
    visible.length > 1 && visible.every((q) => q.audio && q.audio === visible[0].audio)
      ? visible[0].audio
      : undefined

  const submit = useCallback(() => {
    setResult((existing) => {
      if (existing) return existing
      const marked = gradeSection(attempt.answerKey, session.answers)
      onFinished(attempt.sectionId, marked)
      return marked
    })
  }, [attempt, session.answers, onFinished])

  useEffect(() => {
    if (submitted) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [submitted])

  useEffect(() => {
    if (!submitted && remaining <= 0) submit()
  }, [remaining, submitted, submit])

  // Bring the selected question into view after a jump from the bottom strip.
  useEffect(() => {
    if (submitted) return
    cardRefs.current.get(current.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current.id, submitted])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') setSession((s) => next(s))
      if (e.key === 'ArrowLeft') setSession((s) => prev(s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const unanswered = attempt.questions.length - session.answeredCount

  if (submitted && result) {
    return (
      <div className="ielts">
        <div className="ielts__scroll">
          <div className="shell">
            <ExamResults
              paper={attempt}
              result={result}
              answers={session.answers}
              shuffled={shuffled}
              onRetry={onRetry}
              onExit={onExit}
            />
          </div>
        </div>
        <QuestionNav
          questions={attempt.questions}
          answers={session.answers}
          flags={session.flags}
          current={session.index}
          onJump={(i) => setSession((s) => goTo(s, i))}
          graded={result.questions}
        />
      </div>
    )
  }

  const passage = current.passage

  return (
    <div className="ielts">
      <header className="ielts__bar">
        <div>
          <div className="examBar__part">{current.partTitle}</div>
          <div className="examBar__vi">{current.partVi}</div>
        </div>
        <div className="examBar__spacer" />
        <ClockPill seconds={remaining} />
        <button className="btn btn--sm btn--primary" onClick={submit}>
          Nộp bài{unanswered > 0 ? ` · còn ${unanswered}` : ''}
        </button>
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </header>

      <div className={`ielts__body${passage ? ' ielts__body--split' : ''}`}>
        {passage && (
          <aside className="ielts__passage" aria-label="Bài đọc">
            <h3 className="passage__title">{passage.title}</h3>
            <p className="passage__body">{passage.body}</p>
          </aside>
        )}

        <section className="ielts__questions">
          {current.instructions && <p className="instructions">{current.instructions}</p>}

          {sharedAudio && (
            <AudioPlayer
              src={sharedAudio}
              maxPlays={maxPlays}
              label={current.noteTitle ?? `Bản ghi — ${current.partTitle}`}
            />
          )}

          {visible.map((q) => {
            const given = session.answers[q.id]
            const isFlagged = session.flags.includes(q.id)

            return (
              <article
                key={q.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(q.id, el)
                  else cardRefs.current.delete(q.id)
                }}
                className={`qCard${q.id === current.id ? ' qCard--here' : ''}`}
                onFocusCapture={() => {
                  const i = attempt.questions.indexOf(q)
                  if (i !== session.index) setSession((s) => goTo(s, i))
                }}
              >
                <div className="qHead">
                  <span className="qHead__num">{String(q.number).padStart(2, '0')}</span>
                  <h2 className="qHead__prompt">{q.prompt}</h2>
                  <button
                    className={`flagBtn${isFlagged ? ' flagBtn--on' : ''}`}
                    onClick={() => setSession((s) => toggleFlag(s, q.id))}
                    aria-pressed={isFlagged}
                    title="Đánh dấu để quay lại sau"
                  >
                    <FlagIcon filled={isFlagged} />
                    Xem lại
                  </button>
                </div>

                {!sharedAudio && q.audio && (
                  <AudioPlayer src={q.audio} maxPlays={maxPlays} label={`Câu ${q.number}`} />
                )}

                {q.notice && <pre className="notice">{q.notice}</pre>}

                <QuestionBody
                  q={q}
                  given={given}
                  onAnswer={(value) => setSession((s) => answer(s, q.id, value))}
                  locked={false}
                />
              </article>
            )
          })}
        </section>
      </div>

      <QuestionNav
        questions={attempt.questions}
        answers={session.answers}
        flags={session.flags}
        current={session.index}
        onJump={(i) => setSession((s) => goTo(s, i))}
      />
    </div>
  )
}

export function ExamRunner({ paper, maxPlays = 2, shuffle, onExit, onFinished }: Props) {
  const [sitting, setSitting] = useState(() => ({ no: 1, seed: (Date.now() % 2147483647) + 1 }))

  const attempt = useMemo(
    () => buildAttempt(paper, { shuffle, seed: sitting.seed }),
    [paper, shuffle, sitting.seed],
  )

  const retry = useCallback(() => {
    setSitting((s) => ({ no: s.no + 1, seed: (s.seed * 48271) % 2147483647 }))
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <Attempt
      key={`${paper.sectionId}-${sitting.no}`}
      attempt={attempt}
      maxPlays={maxPlays}
      shuffled={shuffle}
      onExit={onExit}
      onRetry={retry}
      onFinished={onFinished}
    />
  )
}
