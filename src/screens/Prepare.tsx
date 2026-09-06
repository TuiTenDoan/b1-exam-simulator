import { useMemo, useState } from 'react'
import { AudioPlayer } from '../components/AudioPlayer'
import prepare from '../data/prepare.json'

type Props = { onExit: () => void }

type Group = {
  type: 'mcq3' | 'rw' | 'gap' | 'tick'
  label?: string
  from?: number
  count?: number
  options?: string[]
  answers: string[]
  accepts?: string[][]
}

type Task = {
  id: string
  audio: string
  image: string
  title: string
  vi: string
  part: string
  groups: Group[]
}

const MCQ3 = ['A', 'B', 'C']
const RW: { key: string; label: string }[] = [
  { key: 'R', label: '✓ Right' },
  { key: 'W', label: '✗ Wrong' },
]

function normalise(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^£/, '')
}

function isCorrect(group: Group, i: number, given: string): boolean {
  if (!given?.trim()) return false
  if (group.type === 'gap') {
    const accepted = [group.answers[i], ...(group.accepts?.[i] ?? [])]
    return accepted.some((a) => normalise(a) === normalise(given))
  }
  return given === group.answers[i]
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
  group: Group
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
            const key = `${taskId}.${gi}.${opt}`
            const on = answers[key] === 'on'
            const shouldBeOn = group.answers.includes(opt)
            const mark = revealed
              ? on === shouldBeOn
                ? ' pqTick--ok'
                : ' pqTick--no'
              : ''
            return (
              <button
                key={opt}
                className={`pqTick${on ? ' pqTick--on' : ''}${mark}`}
                onClick={() => onAnswer(key, on ? '' : 'on')}
                aria-pressed={on}
              >
                {opt}
                {revealed && shouldBeOn && <span className="pqTick__star">✓</span>}
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
          const key = `${taskId}.${gi}.${n}`
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
                  {(group.type === 'rw' ? RW : MCQ3.map((k) => ({ key: k, label: k }))).map(
                    (c) => (
                      <button
                        key={c.key}
                        className={`pqChoice${given === c.key ? ' pqChoice--on' : ''}${
                          revealed && c.key === correct ? ' pqChoice--key' : ''
                        }`}
                        onClick={() => onAnswer(key, given === c.key ? '' : c.key)}
                        aria-pressed={given === c.key}
                      >
                        {c.label}
                      </button>
                    ),
                  )}
                </span>
              )}

              {revealed && (
                <span className={`tag ${ok ? 'tag--ok' : 'tag--no'}`}>
                  {ok ? 'Đúng' : group.type === 'gap' ? group.answers[i] : correct}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Prepare({ onExit }: Props) {
  const tasks = prepare.tasks as Task[]
  const [openId, setOpenId] = useState<string>(tasks[0].id)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  const [missingSheet, setMissingSheet] = useState<Set<string>>(new Set())

  const task = useMemo(() => tasks.find((t) => t.id === openId)!, [tasks, openId])
  const revealed = revealedIds.has(task.id)
  const sheetMissing = missingSheet.has(task.id)

  const totals = useMemo(() => {
    let total = 0
    let correct = 0
    for (const t of tasks) {
      t.groups.forEach((g, gi) => {
        if (g.type === 'tick') {
          // Marked as one item: an untouched box is not a free mark.
          total += 1
          const touched = (g.options ?? []).some(
            (opt) => answers[`${t.id}.${gi}.${opt}`] === 'on',
          )
          const allMatch = (g.options ?? []).every(
            (opt) =>
              (answers[`${t.id}.${gi}.${opt}`] === 'on') === g.answers.includes(opt),
          )
          if (touched && allMatch) correct += 1
          return
        }
        const from = g.from ?? 1
        g.answers.forEach((_, i) => {
          total += 1
          if (isCorrect(g, i, answers[`${t.id}.${gi}.${from + i}`] ?? '')) correct += 1
        })
      })
    }
    return { total, correct }
  }, [tasks, answers])

  const taskQuestionCount = (t: Task) =>
    t.groups.reduce((n, g) => n + (g.type === 'tick' ? 1 : g.answers.length), 0)

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">Đề nghe Cambridge Prepare</div>
          <div className="examBar__vi">
            {tasks.length} bài · {totals.total} câu · audio và đề gốc của bạn
          </div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="prepare">
        <nav className="prepareList" aria-label="Danh sách bài nghe">
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
                {revealedIds.has(t.id) && ' · đã xem đáp án'}
              </span>
            </button>
          ))}
        </nav>

        <main className="prepareMain">
          <div className="panel">
            <h2 className="panel__title">{task.title}</h2>
            <p className="panel__sub">
              {task.part} · {task.vi}
            </p>

            {sheetMissing ? (
              <p className="alert">
                Bài này cần file nghe và ảnh đề của giáo trình Cambridge Prepare. Chúng không đi
                kèm mã nguồn vì lý do bản quyền, nên bản trên mạng sẽ trống chỗ này. Nếu bạn có
                giáo trình, thả <code>{task.audio}.mp3</code> vào{' '}
                <code>public/prepare/audio/</code> và <code>{task.image}.png</code> vào{' '}
                <code>public/prepare/q/</code>. Bốn phần thi chính vẫn chạy đầy đủ.
              </p>
            ) : (
              <>
                <AudioPlayer src={task.audio} dir="prepare/audio" maxPlays={0} label={task.part} />

                {/* Rendered conditionally rather than hidden: `.prepareSheet` sets
                    display:block, which would beat the browser's [hidden] rule and
                    leave a broken-image box on screen. */}
                <img
                  className="prepareSheet"
                  src={`${import.meta.env.BASE_URL}prepare/q/${task.image}.png`}
                  alt={`Đề bài: ${task.title}`}
                  onError={() => setMissingSheet((s) => new Set(s).add(task.id))}
                />
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
