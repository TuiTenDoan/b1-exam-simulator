import type { PaperChoice, Route } from '../App'
import { mark } from '../lib/format'
import { listeningPaper, listeningPapers, readingPaper, readingPapers } from '../lib/paper'
import speaking from '../data/speaking.json'
import writing from '../data/writing.json'
import prepare from '../data/prepare.json'
import prepareReading from '../data/prepareReading.json'
import { taskQuestionCount, type PrepareBoard } from '../domain/prepareMark'

const listeningBoard = prepare as unknown as PrepareBoard
const readingBoard = prepareReading as unknown as PrepareBoard

/** Counted from the data so these never drift when content is added. */
const countBoard = (board: PrepareBoard) =>
  board.tasks.reduce((n, t) => n + taskQuestionCount(t), 0)

const prepareQuestions = countBoard(listeningBoard) + countBoard(readingBoard)

const examQuestions = listeningPaper.questions.length + readingPaper.questions.length

const recordings =
  new Set(listeningPaper.questions.map((q) => q.audio).filter(Boolean)).size +
  speaking.round1.topics.reduce((n, t) => n + t.questions.length, 0) +
  speaking.round2.topics.reduce((n, t) => n + t.samples.length, 0) +
  prepare.tasks.length

const paperCount = Math.max(listeningPapers.length, readingPapers.length)

/** "2 đề" reads better than "2 papers available" and is checked from the data. */
const paperCountLabel = (n: number) => (n > 1 ? `${n} đề` : '1 đề')

type Props = {
  onGo: (route: Route) => void
  best: Record<string, number>
  shuffle: boolean
  onShuffleChange: (value: boolean) => void
  paperChoice: PaperChoice
  onPaperChange: (value: PaperChoice) => void
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
    selfGraded: true,
  },
  {
    route: 'listening' as Route,
    num: 'II',
    name: 'Listening',
    desc: `${listeningPaper.questions.length} câu · ${paperCountLabel(
      listeningPapers.length,
    )} · nghe hình, hội thoại, điền từ`,
    marks: '10đ',
  },
  {
    route: 'reading' as Route,
    num: 'III',
    name: 'Reading, Grammar & Vocabulary',
    desc: `${readingPaper.questions.length} câu · ${paperCountLabel(
      readingPapers.length,
    )} · ngữ pháp, từ vựng, đọc hiểu, điền từ`,
    marks: '10đ',
  },
  {
    route: 'writing' as Route,
    num: 'IV',
    name: 'Writing',
    desc: `8 câu hoàn thành (4đ) + 1 bài luận ${writing.part2.minWords}–${writing.part2.maxWords} từ (6đ)`,
    marks: '10đ',
    selfGraded: true,
  },
  {
    route: 'prepare' as Route,
    num: '+',
    name: 'Đề nghe Cambridge Prepare',
    desc: `${listeningBoard.tasks.length} bài nghe từ giáo trình của bạn · ${countBoard(
      listeningBoard,
    )} câu · audio và đề gốc`,
    marks: 'ôn thêm',
  },
  {
    route: 'prepare-reading' as Route,
    num: '+',
    name: 'Đề đọc Cambridge Prepare',
    desc: `${readingBoard.tasks.length} bài từ vựng và đọc hiểu · ${countBoard(
      readingBoard,
    )} câu · ảnh đề gốc`,
    marks: 'ôn thêm',
  },
]

export function Home({ onGo, best, shuffle, onShuffleChange, paperChoice, onPaperChange }: Props) {
  return (
    <div className="shell">
      <section className="cover">
        <div className="cover__grid">
          <div>
            <h1>
              Thi thử Anh văn
              <br />
              chuẩn đầu ra, trình độ B1
            </h1>
            <p className="cover__lede">
              Đề mô phỏng đúng cấu trúc kỳ thi: bốn phần độc lập, mỗi phần 10 điểm, mức đạt 5.0.
              Phần nghe có file âm thanh thật và mỗi bản ghi chỉ được phát hai lượt, giống trong
              phòng thi.
            </p>

            <button className="btn btn--primary" onClick={() => onGo('listening')}>
              Bắt đầu phần Nghe <Arrow />
            </button>

            <dl className="spec">
              <div className="spec__row">
                <dt>Cấu trúc</dt>
                <dd>Bốn phần thi độc lập, mỗi phần 10 điểm</dd>
              </div>
              <div className="spec__row">
                <dt>Trắc nghiệm</dt>
                <dd>
                  <span className="mono">{examQuestions + prepareQuestions}</span> câu, chấm ngay
                  khi nộp
                </dd>
              </div>
              <div className="spec__row">
                <dt>Bản ghi âm</dt>
                <dd>
                  <span className="mono">{recordings}</span> file, mỗi bản phát tối đa 2 lượt
                </dd>
              </div>
              <div className="spec__row">
                <dt>Mức đạt</dt>
                <dd>
                  <span className="mono">5,0</span> trên 10
                </dd>
              </div>
            </dl>
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
                  {s.selfGraded ? (
                    <span className="section__score" style={{ color: 'var(--ink-3)' }}>
                      {s.marks}
                      <span className="section__scoreLabel">bạn tự chấm</span>
                    </span>
                  ) : best[s.route] !== undefined ? (
                    <span className="section__score">
                      {mark(best[s.route])}
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

            {paperCount > 1 && (
              <div className="setting">
                <div className="setting__label">
                  <span className="setting__name">Bộ đề</span>
                  <span className="setting__hint">
                    {paperChoice === 'random'
                      ? `Mỗi lần vào thi bốc ngẫu nhiên một trong ${paperCount} đề.`
                      : `Đang cố định Đề ${paperChoice + 1} — làm mãi một đề là thuộc lòng.`}
                    {listeningPapers.length !== readingPapers.length &&
                      ` Nghe có ${listeningPapers.length} đề, Đọc có ${readingPapers.length} đề.`}
                  </span>
                </div>
                <div className="chips" role="group" aria-label="Chọn bộ đề">
                  {Array.from({ length: paperCount }, (_, i) => (
                    <button
                      key={i}
                      className={`chip${paperChoice === i ? ' chip--on' : ''}`}
                      aria-pressed={paperChoice === i}
                      onClick={() => onPaperChange(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className={`chip${paperChoice === 'random' ? ' chip--on' : ''}`}
                    aria-pressed={paperChoice === 'random'}
                    onClick={() => onPaperChange('random')}
                  >
                    Ngẫu nhiên
                  </button>
                </div>
              </div>
            )}

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
