import { useMemo, useState } from 'react'
import study from '../data/study.json'

type Props = { onExit: () => void }

type Example = { en: string; vi: string }

type Block = {
  type: 'tense' | 'pattern' | 'steps' | 'checklist' | 'phrases' | 'topics' | 'note'
  name: string
  en?: string
  use?: string
  rule?: string
  trigger?: string
  body?: string
  signalNote?: string
  forms?: string[]
  stems?: string[]
  signals?: string[]
  traps?: string[]
  items?: (string | { label: string; hint: string })[]
  example?: Example
  table?: { caption?: string; head: string[]; rows: string[][] }
}

type Lesson = {
  id: string
  title: string
  vi: string
  source: string
  intro: string
  blocks: Block[]
}

function TickIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v5M12 17.5v.5" />
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

function Example({ example }: { example: Example }) {
  return (
    <div className="studyEg">
      <p className="studyEg__en">{example.en}</p>
      <p className="studyEg__vi">{example.vi}</p>
    </div>
  )
}

function Traps({ traps }: { traps: string[] }) {
  return (
    <ul className="studyTraps">
      {traps.map((t) => (
        <li key={t}>
          <span className="studyTraps__mark" aria-hidden="true">
            <WarnIcon />
          </span>
          {t}
        </li>
      ))}
    </ul>
  )
}

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case 'tense':
      return (
        <>
          {block.use && <p className="studyCard__use">{block.use}</p>}

          {block.forms && (
            <ul className="studyForms">
              {block.forms.map((f) => (
                <li key={f} className="mono">
                  {f}
                </li>
              ))}
            </ul>
          )}

          {block.signals && (
            <>
              <h4 className="studyCard__sub">Dấu hiệu nhận biết</h4>
              <ul className="signals">
                {block.signals.map((s) => (
                  <li key={s} className="signal">
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          {block.signalNote && <p className="studyCard__note">{block.signalNote}</p>}

          {block.rule && <p className="studyCard__rule">{block.rule}</p>}
          {block.example && <Example example={block.example} />}

          {block.table && (
            <div className="studyTableWrap">
              {block.table.caption && <p className="studyCard__sub">{block.table.caption}</p>}
              <table className="studyTable">
                <thead>
                  <tr>
                    {block.table.head.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i} className={i === 0 ? 'mono' : undefined}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {block.traps && <Traps traps={block.traps} />}
        </>
      )

    case 'pattern':
      return (
        <>
          {block.rule && <p className="studyCard__rule">{block.rule}</p>}

          {block.stems && (
            <>
              <h4 className="studyCard__sub">Những câu rơi vào nhóm này</h4>
              <ul className="studyForms">
                {block.stems.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}

          {block.example && <Example example={block.example} />}
          {block.traps && <Traps traps={block.traps} />}
        </>
      )

    case 'steps':
      return (
        <ol className="studySteps">
          {(block.items ?? []).map((it, i) => {
            const step = it as { label: string; hint: string }
            return (
              <li key={step.label}>
                <span className="studySteps__n mono">{i + 1}</span>
                <span>
                  <strong>{step.label}</strong>
                  <span className="studySteps__hint">{step.hint}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )

    case 'checklist':
      return (
        <ul className="studyChecks">
          {(block.items ?? []).map((it) => (
            <li key={String(it)}>
              <span className="studyChecks__mark" aria-hidden="true">
                <TickIcon />
              </span>
              {String(it)}
            </li>
          ))}
        </ul>
      )

    case 'phrases':
      return (
        <ul className="studyPhrases">
          {(block.items ?? []).map((it) => (
            <li key={String(it)}>{String(it)}</li>
          ))}
        </ul>
      )

    case 'topics':
      return (
        <ol className="studyTopics">
          {(block.items ?? []).map((it) => (
            <li key={String(it)}>{String(it)}</li>
          ))}
        </ol>
      )

    case 'note':
      return <p className="note">{block.body}</p>

    default:
      return null
  }
}

export function Study({ onExit }: Props) {
  const lessons = study.lessons as Lesson[]
  const [openId, setOpenId] = useState(lessons[0].id)
  const lesson = useMemo(
    () => lessons.find((l) => l.id === openId) ?? lessons[0],
    [lessons, openId],
  )

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">{study.title}</div>
          <div className="examBar__vi">{study.vi}</div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="prepare">
        <nav className="prepareList" aria-label="Danh sách bài học">
          {lessons.map((l) => (
            <button
              key={l.id}
              className={`prepareItem${l.id === openId ? ' prepareItem--on' : ''}`}
              onClick={() => {
                setOpenId(l.id)
                window.scrollTo({ top: 0 })
              }}
            >
              <span className="prepareItem__part">{l.vi}</span>
              <span className="prepareItem__title">{l.title}</span>
              <span className="prepareItem__meta mono">{l.source}</span>
            </button>
          ))}
        </nav>

        <main className="prepareMain">
          <div className="panel">
            <h2 className="panel__title">{lesson.title}</h2>
            <p className="panel__sub">
              {lesson.vi} · {lesson.source}
            </p>

            <p className="studyIntro">{lesson.intro}</p>

            {lesson.blocks.map((block) => (
              <section key={block.name} className="studyCard">
                <div className="studyCard__head">
                  <h3 className="studyCard__name">
                    {block.name}
                    {block.en && <span className="studyCard__en">{block.en}</span>}
                  </h3>
                  {block.trigger && <span className="studyCard__trigger mono">{block.trigger}</span>}
                </div>
                <BlockBody block={block} />
              </section>
            ))}

            <p className="note" style={{ marginTop: 24, marginBottom: 0 }}>
              {study.note}
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
