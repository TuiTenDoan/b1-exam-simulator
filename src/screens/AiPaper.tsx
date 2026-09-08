import { useCallback, useEffect, useRef, useState } from 'react'
import { ExamRunner } from '../components/ExamRunner'
import { buildPaper, type Paper, type RawPaper } from '../lib/paper'
import { generateReadingPaper, type AiPaperProgress } from '../lib/aiPaper'
import { loadKey, saveKey, GeminiError } from '../lib/gemini'
import type { SectionResult } from '../domain/types'

type Props = {
  shuffle: boolean
  studyMode: boolean
  onExit: () => void
  onFinished: (sectionId: string, result: SectionResult) => void
}

type Status = 'need-key' | 'working' | 'ready' | 'failed'

/**
 * A Reading paper written on demand instead of picked from the four built in.
 *
 * The point is that there is no last paper to memorise: every sitting is new
 * text. The cost is that it needs the learner's own Gemini key and can fail —
 * so failure is a plain message with a way back, never a blank screen, and the
 * four built-in papers stay available the moment the key is switched off.
 */
export function AiPaper({ shuffle, studyMode, onExit, onFinished }: Props) {
  const [apiKey, setApiKey] = useState(loadKey)
  const [status, setStatus] = useState<Status>(() => (loadKey() ? 'working' : 'need-key'))
  const [paper, setPaper] = useState<Paper | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<AiPaperProgress>({ done: 0, total: 5 })
  const [run, setRun] = useState(1)

  const abort = useRef<AbortController | null>(null)

  const build = useCallback(
    async (key: string, attempt: number) => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller

      setStatus('working')
      setError('')
      setProgress({ done: 0, total: 5 })

      try {
        const raw = await generateReadingPaper({
          key,
          // Ids must not repeat between sittings, or two papers would share
          // answer slots in the same session.
          tag: `AI${attempt}_`,
          signal: controller.signal,
          onProgress: setProgress,
        })
        if (controller.signal.aborted) return
        setPaper(buildPaper(raw as unknown as RawPaper))
        setStatus('ready')
      } catch (e) {
        if (controller.signal.aborted || (e as Error).name === 'AbortError') return
        setError(e instanceof GeminiError ? e.message : 'Không sinh được đề. Thử lại lần nữa.')
        setStatus('failed')
      }
    },
    [],
  )

  useEffect(() => {
    if (apiKey) void build(apiKey, run)
    return () => abort.current?.abort()
  }, [build, run, apiKey])

  if (status === 'ready' && paper) {
    return (
      <ExamRunner
        key={`ai-${run}`}
        paper={paper}
        maxPlays={0}
        shuffle={shuffle}
        studyMode={studyMode}
        onExit={onExit}
        onFinished={onFinished}
        onRedraw={() => {
          setPaper(null)
          setRun((n) => n + 1)
        }}
      />
    )
  }

  return (
    <div className="shell">
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">Đề đọc do AI soạn</div>
          <div className="examBar__vi">50 câu mới mỗi lần, bám phạm vi tài liệu ôn thi</div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        {status === 'need-key' && (
          <div className="keyBox">
            <p className="keyBox__title">Cần key Google Gemini để sinh đề</p>
            <p className="keyBox__note">
              Key lưu trong trình duyệt này, không gửi lên web và không nằm trong mã nguồn. Lấy
              key miễn phí tại{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
              . Không có key thì bốn đề có sẵn vẫn dùng bình thường.
            </p>
            <div className="keyBox__row">
              <input
                type="password"
                className="stemLine__input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dán key vào đây"
                autoComplete="off"
                spellCheck={false}
                aria-label="Google Gemini API key"
              />
              <button
                className="btn btn--primary"
                disabled={!apiKey.trim()}
                onClick={() => {
                  saveKey(apiKey)
                  setRun((n) => n + 1)
                }}
              >
                Lưu và sinh đề
              </button>
            </div>
          </div>
        )}

        {status === 'working' && (
          <>
            <h2 className="panel__title">Đang soạn đề…</h2>
            <p className="panel__sub">
              Năm phần được soạn song song. Mỗi phần đều bị kiểm lại trước khi hiện ra, nên đề
              nào sai định dạng sẽ được soạn lại chứ không đưa cho bạn làm.
            </p>
            <div className="aiProgress" aria-live="polite">
              <div className="aiProgress__bar">
                <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <span className="mono aiProgress__count">
                {progress.done}/{progress.total} phần
              </span>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <h2 className="panel__title">Chưa sinh được đề</h2>
            <p className="alert">{error}</p>
            <div className="qNav">
              <button className="btn btn--primary" onClick={() => setRun((n) => n + 1)}>
                Thử lại
              </button>
              <button className="btn" onClick={() => setStatus('need-key')}>
                Đổi key
              </button>
              <div className="qNav__spacer" />
              <button className="btn" onClick={onExit}>
                Về trang chính
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
