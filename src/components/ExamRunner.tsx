import { useCallback, useEffect, useMemo, useState } from 'react'
import { AudioPlayer } from './AudioPlayer'
import { OmrSheet } from './OmrSheet'
import { Scene } from '../art/Scene'
import { ExamResults } from './ExamResults'
import { answer, createSession, goTo, next, prev } from '../domain/examSession'
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
}: {
  q: FlatQuestion
  given: string | undefined
  onAnswer: (value: string) => void
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

/** One sitting. Remounted on retry, which resets the clock, the sheet and the shuffle. */
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

  const remaining = remainingAt(startedAt, attempt.durationSeconds, now)
  const submitted = result !== null

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') setSession((s) => next(s))
      if (e.key === 'ArrowLeft') setSession((s) => prev(s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = attempt.questions[session.index]
  const given = session.answers[q.id]
  const unanswered = attempt.questions.length - session.answeredCount

  return (
    <div className="shell">
      <div className="exam">
        <main className="examMain">
          {submitted && result ? (
            <ExamResults
              paper={attempt}
              result={result}
              answers={session.answers}
              shuffled={shuffled}
              onRetry={onRetry}
              onExit={onExit}
            />
          ) : (
            <>
              <div className="examBar">
                <div>
                  <div className="examBar__part">{q.partTitle}</div>
                  <div className="examBar__vi">{q.partVi}</div>
                </div>
                <div className="examBar__spacer" />
                <ClockPill seconds={remaining} />
                <button className="btn btn--sm" onClick={onExit}>
                  Thoát
                </button>
              </div>

              {q.instructions && <p className="instructions">{q.instructions}</p>}

              {q.audio && (
                <AudioPlayer
                  src={q.audio}
                  maxPlays={maxPlays}
                  label={q.noteTitle ?? `Bản ghi — ${q.partTitle}`}
                />
              )}

              {q.passage && (
                <article className="passage">
                  <h3 className="passage__title">{q.passage.title}</h3>
                  <p className="passage__body">{q.passage.body}</p>
                </article>
              )}

              {q.notice && <pre className="notice">{q.notice}</pre>}

              <div className="qCard" key={q.id}>
                <div className="qHead">
                  <span className="qHead__num">{String(q.number).padStart(2, '0')}</span>
                  <h2 className="qHead__prompt">{q.prompt}</h2>
                </div>

                <QuestionBody
                  q={q}
                  given={given}
                  onAnswer={(value) => setSession((s) => answer(s, q.id, value))}
                />
              </div>

              <div className="qNav">
                <button
                  className="btn"
                  onClick={() => setSession((s) => prev(s))}
                  disabled={session.index === 0}
                >
                  ← Câu trước
                </button>
                <button
                  className="btn"
                  onClick={() => setSession((s) => next(s))}
                  disabled={session.index === attempt.questions.length - 1}
                >
                  Câu sau →
                </button>
                <div className="qNav__spacer" />
                <button className="btn btn--primary" onClick={submit}>
                  Nộp bài{unanswered > 0 ? ` (còn ${unanswered} câu trống)` : ''}
                </button>
              </div>
            </>
          )}
        </main>

        <OmrSheet
          questions={attempt.questions}
          answers={session.answers}
          current={session.index}
          onJump={(i) => setSession((s) => goTo(s, i))}
          graded={result?.questions}
        />
      </div>
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
