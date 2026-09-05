import { useEffect, useRef, useState } from 'react'
import { AudioPlayer } from '../components/AudioPlayer'
import { formatClock } from '../domain/timer'
import speaking from '../data/speaking.json'

type Props = { onExit: () => void }
type Round = 1 | 2

type Topic1 = (typeof speaking.round1.topics)[number]
type Topic2 = (typeof speaking.round2.topics)[number]

function drawIndex(length: number, avoid: number | null): number {
  if (length <= 1) return 0
  let i = Math.floor(Math.random() * length)
  while (i === avoid) i = Math.floor(Math.random() * length)
  return i
}

/** Records the candidate locally so they can hear themselves back. Nothing leaves the browser. */
function Recorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    if (url) URL.revokeObjectURL(url)
  }, [url])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        stream.getTracks().forEach((t) => t.stop())
      }
      rec.start()
      recorderRef.current = rec
      setRecording(true)
    } catch {
      setError('Trình duyệt chưa được cấp quyền dùng micro. Bạn vẫn có thể luyện nói mà không ghi âm.')
    }
  }

  function stop() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="qNav" style={{ marginTop: 0 }}>
        {recording ? (
          <button className="btn btn--primary" onClick={stop}>
            ■ Dừng ghi âm
          </button>
        ) : (
          <button className="btn" onClick={start}>
            ● Ghi âm phần trả lời
          </button>
        )}
      </div>
      {error && (
        <p className="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          {error}
        </p>
      )}
      {url && !recording && (
        <audio
          controls
          src={url}
          style={{ width: '100%', marginTop: 12 }}
          aria-label="Nghe lại phần ghi âm của bạn"
        />
      )}
    </div>
  )
}

function PrepTimer({ seconds, keyReset }: { seconds: number; keyReset: string }) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setLeft(seconds)
    setRunning(false)
  }, [keyReset, seconds])

  useEffect(() => {
    if (!running || left <= 0) return
    const id = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, left])

  return (
    <div className="qNav" style={{ marginTop: 18 }}>
      <span className={`clock${left === 0 ? ' clock--critical' : left <= 30 ? ' clock--warning' : ''}`}>
        <span className="clock__dot" />
        {formatClock(left)}
      </span>
      <button className="btn btn--sm" onClick={() => setRunning((r) => !r)} disabled={left === 0}>
        {running ? 'Tạm dừng' : 'Bấm giờ'}
      </button>
      <button
        className="btn btn--sm btn--ghost"
        onClick={() => {
          setLeft(seconds)
          setRunning(false)
        }}
      >
        Đặt lại
      </button>
    </div>
  )
}

export function Speaking({ onExit }: Props) {
  const [round, setRound] = useState<Round>(1)
  const [i1, setI1] = useState<number | null>(null)
  const [i2, setI2] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [sampleIdx, setSampleIdx] = useState(0)

  const topic1: Topic1 | null = i1 === null ? null : speaking.round1.topics[i1]
  const topic2: Topic2 | null = i2 === null ? null : speaking.round2.topics[i2]

  function draw() {
    if (round === 1) {
      setI1((prev) => drawIndex(speaking.round1.topics.length, prev))
    } else {
      setI2((prev) => drawIndex(speaking.round2.topics.length, prev))
      setSampleIdx(0)
    }
    setRevealed(false)
  }

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="examBar" style={{ marginTop: 24 }}>
        <div>
          <div className="examBar__part">Speaking</div>
          <div className="examBar__vi">Thi nói — 2 vòng, tổng 10 điểm</div>
        </div>
        <div className="examBar__spacer" />
        <button className="btn btn--sm" onClick={onExit}>
          Thoát
        </button>
      </div>

      <div className="qNav" style={{ marginTop: 0, marginBottom: 24 }}>
        <button
          className={`btn btn--sm${round === 1 ? ' btn--primary' : ''}`}
          onClick={() => setRound(1)}
        >
          Vòng 1 — Social interaction (5đ)
        </button>
        <button
          className={`btn btn--sm${round === 2 ? ' btn--primary' : ''}`}
          onClick={() => setRound(2)}
        >
          Vòng 2 — Topic development (5đ)
        </button>
      </div>

      <div className="split">
        <div className="panel">
          <h2 className="panel__title">
            {round === 1 ? 'Bốc thăm chủ đề giao tiếp' : 'Bốc thăm chủ đề thuyết trình'}
          </h2>
          <p className="panel__sub">
            {round === 1
              ? 'Thăm vòng 1 chỉ ghi tên chủ đề — không có sẵn câu hỏi, giống thăm thật.'
              : 'Thăm vòng 2 có đủ chủ đề và các gợi ý. Bạn có khoảng 3 phút để trình bày.'}
          </p>

          {(round === 1 ? topic1 : topic2) === null ? (
            <div className="empty">
              <p className="empty__title">Chưa bốc thăm</p>
              <p>Bấm nút bên dưới để rút một chủ đề ngẫu nhiên.</p>
              <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={draw}>
                Bốc thăm
              </button>
            </div>
          ) : (
            <>
              <div className="drawCard">
                <p className="cover__eyebrow" style={{ marginBottom: 10 }}>
                  {round === 1 ? 'Chủ đề vòng 1' : 'Chủ đề vòng 2'}
                </p>
                <p className="drawCard__topic">
                  {round === 1 ? topic1!.name : topic2!.name}
                </p>
                <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                  {round === 1 ? topic1!.vi : topic2!.vi}
                </p>

                {round === 2 && (
                  <ul className="cueList">
                    {topic2!.cues.map((cue, n) => (
                      <li key={cue}>
                        <span className="cueList__n">{String(n + 1).padStart(2, '0')}</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <PrepTimer
                seconds={round === 1 ? speaking.round1.durationSeconds : speaking.round2.durationSeconds}
                keyReset={`${round}-${round === 1 ? i1 : i2}`}
              />

              <Recorder />

              <div className="qNav">
                <button className="btn" onClick={draw}>
                  Bốc thăm khác
                </button>
                {round === 1 && !revealed && (
                  <button className="btn btn--primary" onClick={() => setRevealed(true)}>
                    Xem câu hỏi &amp; bài mẫu
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <h2 className="panel__title">Bài mẫu</h2>
          <p className="panel__sub">Nghe giọng đọc chậm hơn tốc độ thi để luyện phát âm.</p>

          {round === 1 &&
            (topic1 === null ? (
              <div className="empty">
                <p className="empty__title">Chưa có chủ đề</p>
                <p>Bốc thăm trước để xem bộ câu hỏi và câu trả lời mẫu.</p>
              </div>
            ) : !revealed ? (
              <div className="empty">
                <p className="empty__title">Thử tự trả lời trước</p>
                <p>
                  Trong phòng thi bạn không biết trước câu hỏi. Hãy tự nói về chủ đề
                  {' '}<strong>{topic1.name}</strong>, rồi bấm “Xem câu hỏi &amp; bài mẫu”.
                </p>
              </div>
            ) : (
              <div>
                {topic1.questions.map((q) => (
                  <div className="qaItem" key={q.id}>
                    <p className="qaItem__q">
                      <span className="cueList__n mono">Q</span>
                      {q.q}
                    </p>
                    <p className="qaItem__a">{q.a}</p>
                    <p className="qaItem__vi">{q.vi}</p>
                    <div style={{ marginTop: 10 }}>
                      <AudioPlayer src={`SP_${q.id}`} label="Hỏi &amp; đáp mẫu" />
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {round === 2 &&
            (topic2 === null ? (
              <div className="empty">
                <p className="empty__title">Chưa có chủ đề</p>
                <p>Bốc thăm trước để xem hai bài nói mẫu.</p>
              </div>
            ) : (
              <div>
                <div className="qNav" style={{ marginTop: 0, marginBottom: 16 }}>
                  {topic2.samples.map((s, n) => (
                    <button
                      key={s.id}
                      className={`btn btn--sm${sampleIdx === n ? ' btn--primary' : ''}`}
                      onClick={() => setSampleIdx(n)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <AudioPlayer src={topic2.samples[sampleIdx].audio} label="Bài nói mẫu" />

                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13.5, color: 'var(--ink-2)' }}>
                    Câu mở đầu &amp; kết thúc bắt buộc
                  </summary>
                  <p className="reviewItem__explain" style={{ marginTop: 10 }}>
                    {speaking.round2.opening}
                  </p>
                  <p className="reviewItem__explain" style={{ marginTop: 8 }}>
                    {speaking.round2.closing}
                  </p>
                </details>

                <p style={{ fontSize: 15, lineHeight: 1.8 }}>{topic2.samples[sampleIdx].body}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
