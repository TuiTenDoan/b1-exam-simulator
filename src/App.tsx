import { useCallback, useEffect, useState } from 'react'
import { Home } from './screens/Home'
import { Speaking } from './screens/Speaking'
import { Writing } from './screens/Writing'
import { Prepare } from './screens/Prepare'
import { ExamRunner } from './components/ExamRunner'
import { listeningPaper, readingPaper } from './lib/paper'
import prepareListening from './data/prepare.json'
import prepareReading from './data/prepareReading.json'
import type { PrepareBoard } from './domain/prepareMark'
import type { SectionResult } from './domain/types'

export type Route =
  | 'home'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'prepare'
  | 'prepare-reading'

const ROUTES: Route[] = [
  'home',
  'listening',
  'reading',
  'writing',
  'speaking',
  'prepare',
  'prepare-reading',
]

/* JSON keeps every string wide (`string`, not `'gap' | 'mcq3'`), so the shape
   is asserted once here rather than at every use inside the board. */
const LISTENING_BOARD = prepareListening as unknown as PrepareBoard
const READING_BOARD = prepareReading as unknown as PrepareBoard
const BEST_KEY = 'b1-exam:best'

function routeFromHash(): Route {
  const raw = window.location.hash.replace('#/', '')
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : 'home'
}

/** Best score per section, kept on this device only. */
function loadBest(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

const SHUFFLE_KEY = 'b1-exam:shuffle'

function loadShuffle(): boolean {
  try {
    return localStorage.getItem(SHUFFLE_KEY) !== 'off'
  } catch {
    return true
  }
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [best, setBest] = useState<Record<string, number>>(loadBest)
  const [theme, setTheme] = useState<'light' | 'dark' | null>(
    () => (localStorage.getItem('b1-exam:theme') as 'light' | 'dark' | null) ?? null,
  )
  const [shuffle, setShuffle] = useState<boolean>(loadShuffle)

  useEffect(() => {
    try {
      localStorage.setItem(SHUFFLE_KEY, shuffle ? 'on' : 'off')
    } catch {
      /* private mode — the setting just won't persist */
    }
  }, [shuffle])

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('b1-exam:theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  const go = useCallback((next: Route) => {
    window.location.hash = next === 'home' ? '#/' : `#/${next}`
    setRoute(next)
    window.scrollTo({ top: 0 })
  }, [])

  const record = useCallback((sectionId: string, result: SectionResult) => {
    setBest((prev) => {
      if (prev[sectionId] !== undefined && prev[sectionId] >= result.score10) return prev
      const updated = { ...prev, [sectionId]: result.score10 }
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(updated))
      } catch {
        /* private mode — scores just won't persist */
      }
      return updated
    })
  }, [])

  const home = useCallback(() => go('home'), [go])

  return (
    <div className="app">
      <header className="topbar">
        <button className="topbar__brand" onClick={home}>
          <span className="topbar__mark">B1</span>
          <span>
            <span className="topbar__title">Luyện thi chuẩn đầu ra</span>
            <br />
            <span className="topbar__sub">Nam Can Tho University</span>
          </span>
        </button>
        <div className="topbar__spacer" />
        <button
          className="btn btn--ghost btn--icon"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label="Đổi giao diện sáng / tối"
          title="Đổi giao diện sáng / tối"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <main style={{ flex: 1 }}>
        {route === 'home' && (
          <Home onGo={go} best={best} shuffle={shuffle} onShuffleChange={setShuffle} />
        )}
        {route === 'listening' && (
          <ExamRunner
            key="listening"
            paper={listeningPaper}
            maxPlays={2}
            shuffle={shuffle}
            onExit={home}
            onFinished={record}
          />
        )}
        {route === 'reading' && (
          <ExamRunner
            key="reading"
            paper={readingPaper}
            maxPlays={0}
            shuffle={shuffle}
            onExit={home}
            onFinished={record}
          />
        )}
        {route === 'writing' && <Writing onExit={home} />}
        {route === 'speaking' && <Speaking onExit={home} />}
        {route === 'prepare' && <Prepare key="pl" data={LISTENING_BOARD} onExit={home} />}
        {route === 'prepare-reading' && (
          <Prepare key="pr" data={READING_BOARD} onExit={home} />
        )}
      </main>
    </div>
  )
}
