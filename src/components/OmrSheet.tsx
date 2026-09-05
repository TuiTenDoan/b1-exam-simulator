import type { FlatQuestion } from '../lib/paper'
import type { GradedQuestion } from '../domain/types'

type Props = {
  questions: FlatQuestion[]
  answers: Record<string, string>
  current: number
  onJump: (index: number) => void
  /** Present once the paper is marked; switches the sheet to review colours. */
  graded?: GradedQuestion[]
}

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * The answer sheet a candidate actually fills in: numbered rows of bubbles.
 * Doubles as progress and as jump-to navigation, and becomes the marked sheet
 * after submission.
 */
export function OmrSheet({ questions, answers, current, onJump, graded }: Props) {
  const gradedById = new Map((graded ?? []).map((g) => [g.id, g]))
  const answered = questions.filter((q) => answers[q.id]?.trim()).length

  return (
    <aside className="omr" aria-label="Phiếu trả lời">
      <div className="omr__head">
        <span className="omr__title">Phiếu trả lời</span>
        <span className="omr__count mono">
          {answered}/{questions.length}
        </span>
      </div>

      <div className="omr__rows">
        {questions.map((q, i) => {
          const given = answers[q.id]
          const mark = gradedById.get(q.id)
          const isHere = i === current

          return (
            <button
              key={q.id}
              className={`omrRow${isHere ? ' omrRow--here' : ''}`}
              onClick={() => onJump(i)}
              aria-label={`Câu ${q.number}${given ? `, đã chọn ${given}` : ', chưa trả lời'}`}
              aria-current={isHere ? 'true' : undefined}
            >
              <span className="omrRow__n">{q.number}</span>

              {q.kind === 'gap' ? (
                <span
                  className={`omrRow__bar${
                    mark
                      ? mark.isCorrect
                        ? ' omrRow__bar--correct'
                        : ' omrRow__bar--wrong'
                      : given
                        ? ' omrRow__bar--on'
                        : ''
                  }`}
                />
              ) : (
                <span className="omrRow__bubbles">
                  {LETTERS.slice(0, Math.max(q.options.length, 2)).map((letter) => {
                    const picked = given === letter
                    const isKey = q.correct === letter

                    let cls = 'bubble'
                    if (mark) {
                      if (picked && mark.isCorrect) cls += ' bubble--correct'
                      else if (picked) cls += ' bubble--wrong'
                      else if (isKey) cls += ' bubble--key'
                    } else if (picked) {
                      cls += ' bubble--on'
                    }

                    return <span key={letter} className={cls} />
                  })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="omr__foot">
        <div className="omr__legend">
          {graded ? (
            <>
              <span className="omr__legendItem">
                <span className="bubble bubble--correct" /> đúng
              </span>
              <span className="omr__legendItem">
                <span className="bubble bubble--wrong" /> sai
              </span>
              <span className="omr__legendItem">
                <span className="bubble bubble--key" /> đáp án
              </span>
            </>
          ) : (
            <>
              <span className="omr__legendItem">
                <span className="bubble bubble--on" /> đã chọn
              </span>
              <span className="omr__legendItem">
                <span className="bubble" /> còn trống
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
