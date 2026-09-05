import { useMemo, useState } from 'react'
import writing from '../data/writing.json'

type Props = { onExit: () => void }
type Tab = 1 | 2

const SENTENCES_IN_EXAM = 8

function pickEight<T>(pool: T[], seed: number): T[] {
  // Deterministic per draw so re-renders don't reshuffle under the user.
  const items = [...pool]
  const out: T[] = []
  let s = seed
  while (out.length < SENTENCES_IN_EXAM && items.length) {
    s = (s * 1103515245 + 12345) % 2147483648
    out.push(items.splice(s % items.length, 1)[0])
  }
  return out
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function Writing({ onExit }: Props) {
  const [tab, setTab] = useState<Tab>(1)

  // Part 1
  const [seed, setSeed] = useState(() => Date.now() % 100000)
  const drawn = useMemo(() => pickEight(writing.part1.items, seed), [seed])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showSamples, setShowSamples] = useState(false)

  // Part 2
  const [topicIdx, setTopicIdx] = useState(0)
  const [essay, setEssay] = useState('')
  const [showOutline, setShowOutline] = useState(false)
  const topic = writing.part2.topics[topicIdx]
  const words = countWords(essay)
  const inRange = words >= writing.part2.minWords && words <= writing.part2.maxWords
  const over = words > writing.part2.maxWords

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">Writing</div>
          <div className="examBar__vi">Thi viết — 2 phần, tổng 10 điểm</div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="qNav" style={{ marginTop: 0, marginBottom: 24 }}>
        <button className={`btn btn--sm${tab === 1 ? ' btn--primary' : ''}`} onClick={() => setTab(1)}>
          Phần 1 — Hoàn thành câu (4đ)
        </button>
        <button className={`btn btn--sm${tab === 2 ? ' btn--primary' : ''}`} onClick={() => setTab(2)}>
          Phần 2 — Bài luận (6đ)
        </button>
      </div>

      {tab === 1 ? (
        <div className="split">
          <div className="panel">
            <h2 className="panel__title">Viết tiếp 8 câu</h2>
            <p className="panel__sub">{writing.part1.note}</p>

            {drawn.map((item, n) => (
              <div className="stemLine" key={item.id}>
                <span className="stemLine__n">{String(n + 1).padStart(2, '0')}</span>
                <div>
                  <p className="stemLine__stem">
                    {item.stem} <span style={{ color: 'var(--ink-3)' }}>…</span>
                  </p>
                  <input
                    className="stemLine__input"
                    value={answers[item.id] ?? ''}
                    onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                    placeholder="viết tiếp phần còn lại…"
                    autoComplete="off"
                    aria-label={item.stem}
                  />
                  {showSamples && (
                    <p className="stemLine__sample">
                      <strong>Gợi ý:</strong> {item.sample}
                      <br />
                      <span style={{ color: 'var(--ink-3)' }}>{item.grammar}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="qNav">
              <button className="btn btn--primary" onClick={() => setShowSamples((v) => !v)}>
                {showSamples ? 'Ẩn gợi ý' : 'Xem câu mẫu'}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setSeed(Date.now() % 100000)
                  setAnswers({})
                  setShowSamples(false)
                }}
              >
                Bốc đề khác
              </button>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">Toàn bộ 20 câu trong ngân hàng đề</h2>
            <p className="panel__sub">
              Đề thi rút 8 câu bất kỳ từ danh sách này. Học thuộc cấu trúc, đừng học thuộc câu trả lời.
            </p>
            {writing.part1.items.map((item, n) => (
              <div className="qaItem" key={item.id}>
                <p className="qaItem__q">
                  <span className="cueList__n mono">{String(n + 1).padStart(2, '0')}</span>
                  {item.stem} …
                </p>
                <p className="qaItem__a">{item.sample}</p>
                <p className="qaItem__vi">{item.grammar}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="split">
          <div className="panel">
            <h2 className="panel__title">Đề bài</h2>
            <div className="qNav" style={{ marginTop: 0, marginBottom: 16 }}>
              {writing.part2.topics.map((t, n) => (
                <button
                  key={t.id}
                  className={`btn btn--sm${topicIdx === n ? ' btn--primary' : ''}`}
                  onClick={() => {
                    setTopicIdx(n)
                    setShowOutline(false)
                  }}
                >
                  Đề {n + 1}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 15.5, fontWeight: 500, marginBottom: 8 }}>{topic.prompt}</p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 18 }}>{topic.vi}</p>

            <textarea
              className="writeArea"
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder={`Viết ${writing.part2.minWords}–${writing.part2.maxWords} từ. Mở bài, hai thân bài, kết bài.`}
              aria-label="Bài luận của bạn"
            />

            <div
              className={`wordCount${inRange ? ' wordCount--ok' : ''}${over ? ' wordCount--over' : ''}`}
            >
              <span>{words} từ</span>
              <span style={{ color: 'var(--ink-3)' }}>
                · cần {writing.part2.minWords}–{writing.part2.maxWords}
              </span>
              {inRange && <span>· đủ độ dài</span>}
              {over && <span>· đang dài quá</span>}
            </div>

            <div className="qNav">
              <button className="btn btn--primary" onClick={() => setShowOutline((v) => !v)}>
                {showOutline ? 'Ẩn dàn ý' : 'Xem dàn ý gợi ý'}
              </button>
              <button className="btn" onClick={() => setEssay('')} disabled={essay === ''}>
                Xoá bài
              </button>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">Cách triển khai</h2>
            <p className="panel__sub">Bốn đoạn, mỗi đoạn một nhiệm vụ rõ ràng.</p>

            {writing.part2.structure.map((s, n) => (
              <div className="qaItem" key={s.label}>
                <p className="qaItem__q">
                  <span className="cueList__n mono">{String(n + 1).padStart(2, '0')}</span>
                  {s.label}
                </p>
                <p className="qaItem__a">{s.hint}</p>
              </div>
            ))}

            {showOutline && (
              <>
                <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>
                  Dàn ý cho đề {topicIdx + 1}: {topic.sampleTitle}
                </h3>
                <ul className="cueList">
                  {topic.outline.map((line, n) => (
                    <li key={line}>
                      <span className="cueList__n">{String(n + 1).padStart(2, '0')}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>Mẫu câu nên dùng</h3>
            <ul className="cueList">
              {writing.part2.usefulPhrases.map((p, n) => (
                <li key={p}>
                  <span className="cueList__n">{String(n + 1).padStart(2, '0')}</span>
                  <span style={{ fontStyle: 'italic' }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
