import { useMemo, useState } from 'react'
import { AudioPlayer } from '../components/AudioPlayer'
import {
  answerKey,
  choicesFor,
  isCorrect,
  scoreBoard,
  taskQuestionCount,
  type PrepareBoard,
  type PrepareGroup,
} from '../domain/prepareMark'

type Props = { data: PrepareBoard; onExit: () => void }

const MCQ3 = ['A', 'B', 'C'].map((k) => ({ key: k, label: k as React.ReactNode }))

function TickIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

const RW: { key: string; label: React.ReactNode }[] = [
  { key: 'R', label: <><TickIcon /> Right</> },
  { key: 'W', label: <><CrossIcon /> Wrong</> },
]

function choicesShown(group: PrepareGroup, i: number): { key: string; label: React.ReactNode }[] {
  if (group.type === 'rw') return RW
  if (group.type === 'pick') return choicesFor(group, i)
  return MCQ3
}

/** One exercise inside a task — a run of questions sharing an answer format. */
function GroupBlock({
  taskId,
  gi,
  group,
  answers,
  onAnswer,
  revealed,
}: {
  taskId: string
  gi: number
  group: PrepareGroup
  answers: Record<string, string>
  onAnswer: (key: string, value: string) => void
  revealed: boolean
}) {
  const from = group.from ?? 1

  if (group.type === 'tick') {
    return (
      <div className="pqGroup">
        {group.label && <p className="pqGroup__label">{group.label}</p>}
        <div className="pqTicks">
          {(group.options ?? []).map((opt) => {
            const key = answerKey(taskId, gi, opt)
            const on = answers[key] === 'on'
            const shouldBeOn = group.answers.includes(opt)
            const mark = revealed ? (on === shouldBeOn ? ' pqTick--ok' : ' pqTick--no') : ''
            return (
              <button
                key={opt}
                className={`pqTick${on ? ' pqTick--on' : ''}${mark}`}
                onClick={() => onAnswer(key, on ? '' : 'on')}
                aria-pressed={on}
              >
                {opt}
                {revealed && shouldBeOn && (
                  <span className="pqTick__star">
                    <TickIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {revealed && (
          <p className="pqAnswerLine">
            Đáp án: chọn <strong>{group.answers.join(', ')}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="pqGroup">
      {group.label && <p className="pqGroup__label">{group.label}</p>}
      <div className="pqRows">
        {group.answers.map((correct, i) => {
          const n = from + i
          const key = answerKey(taskId, gi, n)
          const given = answers[key] ?? ''
          const ok = isCorrect(group, i, given)

          return (
            <div
              key={key}
              className={`pqRow${revealed ? (ok ? ' pqRow--ok' : ' pqRow--no') : ''}`}
            >
              <span className="pqRow__n mono">{n}</span>

              {group.type === 'gap' ? (
                <input
                  className="pqRow__input"
                  value={given}
                  onChange={(e) => onAnswer(key, e.target.value)}
                  placeholder="một từ / số / giờ…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Câu ${n}`}
                />
              ) : (
                <span className="pqRow__choices">
                  {choicesShown(group, i).map((c) => (
                    <button
                      key={c.key}
                      className={`pqChoice${c.key.length > 1 ? ' pqChoice--word' : ''}${
                        given === c.key ? ' pqChoice--on' : ''
                      }${revealed && c.key === correct ? ' pqChoice--key' : ''}`}
                      onClick={() => onAnswer(key, given === c.key ? '' : c.key)}
                      aria-pressed={given === c.key}
                    >
                      {c.label}
                    </button>
                  ))}
                </span>
              )}

              {revealed && (
                <span className={`tag ${ok ? 'tag--ok' : 'tag--no'}`}>
                  {ok ? 'Đúng' : group.answers[i]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Prepare({ data, onExit }: Props) {
  const { tasks, imageDir, audioDir } = data
  const [openId, setOpenId] = useState<string>(tasks[0].id)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [missingSheet, setMissingSheet] = useState<Set<string>>(new Set())

  const task = useMemo(() => tasks.find((t) => t.id === openId) ?? tasks[0], [tasks, openId])
  const revealed = revealedIds.has(task.id)
  const sheetMissing = missingSheet.has(task.id)

  const totals = useMemo(() => scoreBoard(tasks, answers), [tasks, answers])

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">{data.title}</div>
          <div className="examBar__vi">
            {tasks.length} bài · {totals.total} câu · đề gốc của bạn
          </div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="prepare">
        <nav className="prepareList" aria-label={`Danh sách bài — ${data.title}`}>
          {tasks.map((t) => (
            <button
              key={t.id}
              className={`prepareItem${t.id === openId ? ' prepareItem--on' : ''}`}
              onClick={() => setOpenId(t.id)}
            >
              <span className="prepareItem__part">{t.part}</span>
              <span className="prepareItem__title">{t.title}</span>
              <span className="prepareItem__meta mono">
                {taskQuestionCount(t)} câu
                {revealedIds.has(t.id) ? ' · đã xem đáp án' : ''}
              </span>
            </button>
          ))}
        </nav>

        <main className="prepareMain">
          <div className="panel">
            <h2 className="panel__title">{task.title}</h2>
            <p className="panel__sub">
              {task.part} · {task.vi}
              {task.source ? ` · ${task.source}` : ''}
            </p>

            {task.origin === 'derived' && (
              <p className="note note--warn">
                Tài liệu in bài này nhưng không kèm đáp án, nên đáp án dưới đây là do dò lại từ
                chính trang đề. Câu nào bạn thấy lệch với giáo trình thì cứ tin giáo trình.
              </p>
            )}

            {sheetMissing ? (
              <p className="alert">
                Bài này cần ảnh đề của giáo trình Cambridge Prepare. Ảnh không đi kèm mã nguồn vì
                lý do bản quyền, nên bản trên mạng sẽ trống chỗ này. Nếu bạn có giáo trình, thả{' '}
                <code>{task.images.map((i) => `${i}.png`).join(', ')}</code> vào{' '}
                <code>public/{imageDir}/</code>
                {audioDir && task.audio ? (
                  <>
                    {' '}
                    và <code>{task.audio}.mp3</code> vào <code>public/{audioDir}/</code>
                  </>
                ) : null}
                . Bốn phần thi chính vẫn chạy đầy đủ.
              </p>
            ) : (
              <>
                {audioDir && task.audio ? (
                  <AudioPlayer src={task.audio} dir={audioDir} maxPlays={0} label={task.part} />
                ) : null}

                {/* Rendered conditionally rather than hidden: `.prepareSheet` sets
                    display:block, which would beat the browser's [hidden] rule and
                    leave a broken-image box on screen. */}
                {task.images.map((img) => (
                  <img
                    key={img}
                    className="prepareSheet"
                    src={`${import.meta.env.BASE_URL}${imageDir}/${img}.png`}
                    alt={`Đề bài: ${task.title}`}
                    onError={() => setMissingSheet((s) => new Set(s).add(task.id))}
                  />
                ))}
              </>
            )}

            {task.groups.map((g, gi) => (
              <GroupBlock
                key={gi}
                taskId={task.id}
                gi={gi}
                group={g}
                answers={answers}
                onAnswer={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
                revealed={revealed}
              />
            ))}

            <div className="qNav">
              <button
                className="btn btn--primary"
                onClick={() =>
                  setRevealedIds((s) => {
                    const next = new Set(s)
                    if (next.has(task.id)) next.delete(task.id)
                    else next.add(task.id)
                    return next
                  })
                }
              >
                {revealed ? 'Ẩn đáp án' : 'Chấm bài này'}
              </button>
              <div className="qNav__spacer" />
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Toàn bộ: {totals.correct}/{totals.total}
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
