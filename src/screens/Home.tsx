import type { Route } from '../App'
import { listeningPaper, readingPaper } from '../lib/paper'
import speaking from '../data/speaking.json'
import writing from '../data/writing.json'
import prepare from '../data/prepare.json'

type PrepareGroup = { type: string; answers: string[] }

/** Counted from the data so these never drift when content is added. */
const prepareQuestions = prepare.tasks.reduce(
  (n, t) =>
    n +
    (t.groups as PrepareGroup[]).reduce(
      (m, g) => m + (g.type === 'tick' ? 1 : g.answers.length),
      0,
    ),
  0,
)

const examQuestions = listeningPaper.questions.length + readingPaper.questions.length

const recordings =
  new Set(listeningPaper.questions.map((q) => q.audio).filter(Boolean)).size +
  speaking.round1.topics.reduce((n, t) => n + t.questions.length, 0) +
  speaking.round2.topics.reduce((n, t) => n + t.samples.length, 0) +
  prepare.tasks.length

type Props = {
  onGo: (route: Route) => void
  best: Record<string, number>
  shuffle: boolean
  onShuffleChange: (value: boolean) => void
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const sections = [
  {
    route: 'speaking' as Route,
    num: 'I',
    name: 'Speaking',
    desc: `2 vòng · bốc thăm · ${speaking.round1.topics.length} chủ đề giao tiếp + ${speaking.round2.topics.length} chủ đề thuyết trình`,
    marks: '10đ',
  },
  {
    route: 'listening' as Route,
    num: 'II',
    name: 'Listening',
    desc: `${listeningPaper.questions.length} câu · nghe hình, hội thoại, điền từ · có audio`,
    marks: '10đ',
  },
  {
    route: 'reading' as Route,
    num: 'III',
    name: 'Reading, Grammar & Vocabulary',
    desc: `${readingPaper.questions.length} câu · ngữ pháp, từ vựng, đọc hiểu, điền từ`,
    marks: '10đ',
  },
  {
    route: 'writing' as Route,
    num: 'IV',
    name: 'Writing',
    desc: `8 câu hoàn thành (4đ) + 1 bài luận ${writing.part2.minWords}–${writing.part2.maxWords} từ (6đ)`,
    marks: '10đ',
  },
  {
    route: 'prepare' as Route,
    num: '+',
    name: 'Đề nghe Cambridge Prepare',
    desc: '19 bài nghe từ giáo trình của bạn · audio và đề gốc · có đáp án',
    marks: 'ôn thêm',
  },
]

export function Home({ onGo, best, shuffle, onShuffleChange }: Props) {
  return (
    <div className="shell">
      <section className="cover">
        <div className="cover__grid">
          <div>
            <p className="cover__eyebrow">Anh văn chuẩn đầu ra · Trình độ B1</p>
            <h1>
              Thi thử đủ bốn kỹ năng,
              <br />
              chấm điểm ngay khi nộp.
            </h1>
            <p className="cover__lede">
              Đề mô phỏng đúng cấu trúc kỳ thi: bốn phần độc lập, mỗi phần 10 điểm, mức đạt 5.0.
              Phần nghe có file âm thanh thật và mỗi bản ghi chỉ được phát hai lượt, giống trong
              phòng thi.
            </p>

            <button className="btn btn--primary" onClick={() => onGo('listening')}>
              Bắt đầu phần Nghe <Arrow />
            </button>

            <div className="cover__meta">
              <div className="cover__metaItem">
                <span className="cover__metaValue">4</span>
                <span className="cover__metaLabel">phần thi</span>
              </div>
              <div className="cover__metaItem">
                <span className="cover__metaValue">{examQuestions + prepareQuestions}</span>
                <span className="cover__metaLabel">câu trắc nghiệm</span>
              </div>
              <div className="cover__metaItem">
                <span className="cover__metaValue">{recordings}</span>
                <span className="cover__metaLabel">bản ghi âm</span>
              </div>
              <div className="cover__metaItem">
                <span className="cover__metaValue">5.0</span>
                <span className="cover__metaLabel">mức đạt</span>
              </div>
            </div>
          </div>

          <div className="sections">
            {sections.map((s) => (
              <button key={s.route} className="section" onClick={() => onGo(s.route)}>
                <span className="section__num">{s.num}</span>
                <span>
                  <span className="section__name">{s.name}</span>
                  <span className="section__desc">{s.desc}</span>
                </span>
                <span className="section__right">
                  {best[s.route] !== undefined ? (
                    <span className="section__score">
                      {best[s.route].toFixed(1)}
                      <span className="section__scoreLabel">điểm cao nhất</span>
                    </span>
                  ) : (
                    <span className="section__score" style={{ color: 'var(--ink-3)' }}>
                      {s.marks}
                      <span className="section__scoreLabel">chưa làm</span>
                    </span>
                  )}
                  <span className="section__go">
                    <Arrow />
                  </span>
                </span>
              </button>
            ))}

            <div className="setting">
              <label className="setting__label" htmlFor="shuffle">
                <span className="setting__name">Đảo câu hỏi &amp; đáp án</span>
                <span className="setting__hint">
                  {shuffle
                    ? 'Mỗi lần làm là một thứ tự khác, đáp án đúng không nằm yên một chỗ.'
                    : 'Đang giữ nguyên thứ tự in trong đề — dễ thuộc lòng vị trí đáp án.'}
                </span>
              </label>
              <button
                id="shuffle"
                role="switch"
                aria-checked={shuffle}
                className={`switch${shuffle ? ' switch--on' : ''}`}
                onClick={() => onShuffleChange(!shuffle)}
              >
                <span className="switch__dot" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
