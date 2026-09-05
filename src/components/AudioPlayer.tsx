import { useEffect, useRef, useState } from 'react'
import { formatClock } from '../domain/timer'

type Props = {
  /** Basename of the file inside `dir`. */
  src: string
  /** Folder under /public holding the mp3. */
  dir?: string
  /** Plays allowed before the button locks. 0 means unlimited. */
  maxPlays?: number
  label?: string
  /** Shown instead of the default hint when the file will not load. */
  missingHint?: React.ReactNode
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.4-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

export function AudioPlayer({ src, dir = 'audio', maxPlays = 0, label, missingHint }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [plays, setPlays] = useState(0)
  const [failed, setFailed] = useState(false)

  // A new recording resets the counter — each question gets its own allowance.
  useEffect(() => {
    setPlays(0)
    setTime(0)
    setPlaying(false)
    setFailed(false)
  }, [src])

  const exhausted = maxPlays > 0 && plays >= maxPlays && !playing

  function toggle() {
    const el = ref.current
    if (!el) return
    if (playing) {
      el.pause()
      return
    }
    if (exhausted) return
    void el.play().catch(() => setFailed(true))
  }

  if (failed) {
    return (
      <div className="alert" role="status">
        <span>
          {missingHint ?? (
            <>
              Không phát được file <code>{src}.mp3</code>. Chạy <code>npm run audio</code> để tạo
              lại phần âm thanh.
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="player">
      <audio
        ref={ref}
        src={`${import.meta.env.BASE_URL}${dir}/${src}.mp3`}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true)
          setPlays((n) => n + 1)
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setTime(0)
        }}
        onError={() => setFailed(true)}
      />

      <button
        className="player__btn"
        onClick={toggle}
        disabled={exhausted}
        aria-label={playing ? 'Tạm dừng' : 'Phát bản ghi'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="player__body">
        <div className="player__track">
          <div
            className="player__fill"
            style={{ width: duration ? `${(time / duration) * 100}%` : '0%' }}
          />
        </div>
        <div className="player__meta">
          <span>{label ?? 'Bản ghi'}</span>
          <span>
            {formatClock(time)} / {formatClock(duration)}
            {maxPlays > 0 && (
              <span className="player__plays">
                {' '}
                · còn {Math.max(0, maxPlays - plays)} lượt nghe
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
