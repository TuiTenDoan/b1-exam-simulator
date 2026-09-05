import { PASS_MARK } from '../domain/scoring'
import type { SectionResult } from '../domain/types'
import type { Paper } from '../lib/paper'

type Props = {
  paper: Paper
  result: SectionResult
  answers: Record<string, string>
  /** True when this sitting was randomised, so the retry can promise a new order. */
  shuffled: boolean
  onRetry: () => void
  onExit: () => void
}

function Dial({ score }: { score: number }) {
  const r = 68
  const circumference = 2 * Math.PI * r
  const filled = (Math.min(score, 10) / 10) * circumference

  return (
    <div className="scoreDial">
      <svg viewBox="0 0 156 156" aria-hidden="true">
        <circle cx="78" cy="78" r={r} fill="none" stroke="var(--rule)" strokeWidth="9" />
        <circle
          cx="78"
          cy="78"
          r={r}
          fill="none"
          stroke={score >= PASS_MARK ? 'var(--accent)' : 'var(--wrong)'}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="scoreDial__value">{score.toFixed(1)}</span>
      <span className="scoreDial__of">trên 10 điểm</span>
    </div>
  )
}

/** What the candidate actually wrote or chose, spelled out for the review list. */
function describeAnswer(given: string | null, options: Paper['questions'][number]['options']) {
  if (given === null || given.trim() === '') return 'bỏ trống'
  const match = options.find((o) => o.key === given)
  if (!match) return given
  return match.text ? `${given} — ${match.text}` : given
}

export function ExamResults({ paper, result, answers, shuffled, onRetry, onExit }: Props) {
  const byId = new Map(paper.questions.map((q) => [q.id, q]))
  const wrong = result.questions.filter((g) => !g.isCorrect)

  return (
    <div className="result">
      <div className="scoreHead">
        <Dial score={result.score10} />
        <div>
          <span className={`verdict ${result.passed ? 'verdict--pass' : 'verdict--fail'}`}>
            {result.passed ? 'Đạt' : 'Chưa đạt'}
          </span>
          <h1 style={{ fontSize: 30, marginBottom: 8 }}>{paper.title}</h1>
          <p style={{ color: 'var(--ink-2)', maxWidth: '46ch' }}>
            {result.passed
              ? `Bạn đã vượt mức đạt ${PASS_MARK.toFixed(1)} điểm. Xem lại ${wrong.length} câu sai bên dưới để chắc chắn hơn.`
              : `Mức đạt là ${PASS_MARK.toFixed(1)} điểm. Hãy xem kỹ ${wrong.length} câu sai bên dưới rồi làm lại đề này.`}
          </p>

          <div className="statRow">
            <div className="stat">
              <span className="stat__v">
                {result.correct}/{result.total}
              </span>
              <span className="stat__l">Câu đúng</span>
            </div>
            <div className="stat">
              <span className="stat__v">{result.total - result.answered}</span>
              <span className="stat__l">Bỏ trống</span>
            </div>
            <div className="stat">
              <span className="stat__v">
                {Math.round((result.correct / Math.max(result.total, 1)) * 100)}%
              </span>
              <span className="stat__l">Tỉ lệ chính xác</span>
            </div>
          </div>

          <div className="qNav" style={{ marginTop: 24 }}>
            <button className="btn btn--primary" onClick={onRetry}>
              {shuffled ? 'Làm lại — đảo đề mới' : 'Làm lại đề này'}
            </button>
            <button className="btn" onClick={onExit}>
              Về trang chính
            </button>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Chi tiết từng câu</h2>

      <div className="review">
        {result.questions.map((g) => {
          const q = byId.get(g.id)
          if (!q) return null

          return (
            <article
              key={g.id}
              className={`reviewItem ${g.isCorrect ? 'reviewItem--ok' : 'reviewItem--no'}`}
            >
              <div className="reviewItem__head">
                <span className="reviewItem__n">{String(q.number).padStart(2, '0')}</span>
                <span className="reviewItem__q">{q.prompt}</span>
              </div>

              <div className="reviewItem__ans">
                <span>
                  <span className={`tag ${g.isCorrect ? 'tag--ok' : 'tag--no'}`}>
                    {g.isCorrect ? 'Đúng' : 'Sai'}
                  </span>{' '}
                  Bạn chọn: {describeAnswer(answers[g.id] ?? null, q.options)}
                </span>
                {!g.isCorrect && (
                  <span>
                    <span className="tag tag--muted">Đáp án</span>{' '}
                    {q.kind === 'gap' ? q.correct : describeAnswer(q.correct, q.options)}
                  </span>
                )}
              </div>

              {q.explain && <p className="reviewItem__explain">{q.explain}</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
