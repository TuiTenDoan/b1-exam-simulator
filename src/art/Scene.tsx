/**
 * Line-art scenes for the picture-description questions.
 *
 * Each option in listening.json carries an art spec like `clock:7:45` or
 * `weather:sun`; this renders it. Everything is drawn on a 120x120 grid with a
 * consistent 2.4 stroke so the three options in a question read as a set.
 */
type Props = { spec: string; title?: string }

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const ACCENT = { fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} style={{ color: 'var(--ink-2)' }}>
      {children}
    </svg>
  )
}

/* ---------- clock ---------- */
function Clock({ h, m }: { h: number; m: number }) {
  // 12-hour face; hour hand drifts with the minutes.
  const minAngle = (m / 60) * 360
  const hourAngle = ((h % 12) / 12) * 360 + (m / 60) * 30
  const hand = (angle: number, length: number) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: 60 + Math.cos(rad) * length, y: 60 + Math.sin(rad) * length }
  }
  const hh = hand(hourAngle, 24)
  const mm = hand(minAngle, 34)
  const label = `${h}:${String(m).padStart(2, '0')}`

  return (
    <Frame label={label}>
      <circle cx="60" cy="60" r="44" {...S} />
      {[0, 90, 180, 270].map((a) => {
        const outer = hand(a, 40)
        const inner = hand(a, 33)
        return <line key={a} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} {...S} />
      })}
      <line x1="60" y1="60" x2={hh.x} y2={hh.y} {...S} />
      <line x1="60" y1="60" x2={mm.x} y2={mm.y} {...ACCENT} />
      <circle cx="60" cy="60" r="3.4" fill="var(--accent)" stroke="none" />
    </Frame>
  )
}

/* ---------- weather ---------- */
const weather: Record<string, JSX.Element> = {
  sun: (
    <>
      <circle cx="60" cy="60" r="20" {...ACCENT} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = ((a - 90) * Math.PI) / 180
        return (
          <line
            key={a}
            x1={60 + Math.cos(rad) * 30}
            y1={60 + Math.sin(rad) * 30}
            x2={60 + Math.cos(rad) * 40}
            y2={60 + Math.sin(rad) * 40}
            {...S}
          />
        )
      })}
    </>
  ),
  cloud: (
    <>
      <path d="M36 76h50a16 16 0 0 0 1-32 23 23 0 0 0-43-8 15 15 0 0 0-8 40Z" {...S} />
    </>
  ),
  rain: (
    <>
      <path d="M36 66h50a16 16 0 0 0 1-32 23 23 0 0 0-43-8 15 15 0 0 0-8 40Z" {...S} />
      <line x1="46" y1="80" x2="42" y2="94" {...ACCENT} />
      <line x1="62" y1="80" x2="58" y2="94" {...ACCENT} />
      <line x1="78" y1="80" x2="74" y2="94" {...ACCENT} />
    </>
  ),
}

/* ---------- place ---------- */
const place: Record<string, JSX.Element> = {
  library: (
    <>
      <rect x="24" y="34" width="20" height="56" rx="2" {...S} />
      <rect x="48" y="26" width="20" height="64" rx="2" {...ACCENT} />
      <rect x="72" y="42" width="20" height="48" rx="2" {...S} />
      <line x1="24" y1="96" x2="96" y2="96" {...S} />
    </>
  ),
  gym: (
    <>
      <line x1="30" y1="60" x2="90" y2="60" {...ACCENT} />
      <rect x="18" y="46" width="12" height="28" rx="3" {...S} />
      <rect x="90" y="46" width="12" height="28" rx="3" {...S} />
      <rect x="34" y="52" width="9" height="16" rx="2" {...S} />
      <rect x="77" y="52" width="9" height="16" rx="2" {...S} />
    </>
  ),
  market: (
    <>
      <path d="M26 46h68l-6 46a4 4 0 0 1-4 4H36a4 4 0 0 1-4-4Z" {...S} />
      <path d="M46 46V36a14 14 0 0 1 28 0v10" {...ACCENT} />
      <line x1="20" y1="46" x2="100" y2="46" {...S} />
    </>
  ),
}

/* ---------- objects ---------- */
const object: Record<string, JSX.Element> = {
  camera: (
    <>
      <rect x="20" y="40" width="80" height="50" rx="6" {...S} />
      <path d="M44 40l6-10h20l6 10" {...S} />
      <circle cx="60" cy="65" r="15" {...ACCENT} />
      <circle cx="86" cy="52" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  laptop: (
    <>
      <rect x="26" y="32" width="68" height="44" rx="4" {...S} />
      <rect x="34" y="40" width="52" height="28" rx="2" {...ACCENT} />
      <path d="M16 82h88l-6 8H22Z" {...S} />
    </>
  ),
  shoes: (
    <>
      <path d="M20 74c0-10 4-24 10-24 8 0 6 10 14 12l24 6c10 3 14 6 14 12v6H24a4 4 0 0 1-4-4Z" {...S} />
      <line x1="42" y1="62" x2="38" y2="70" {...ACCENT} />
      <line x1="54" y1="66" x2="50" y2="74" {...ACCENT} />
      <line x1="66" y1="70" x2="62" y2="78" {...ACCENT} />
    </>
  ),
  book: (
    <>
      <path d="M22 30h30a10 10 0 0 1 8 4 10 10 0 0 1 8-4h30v58H68a10 10 0 0 0-8 4 10 10 0 0 0-8-4H22Z" {...S} />
      <line x1="60" y1="38" x2="60" y2="92" {...ACCENT} />
    </>
  ),
}

/* ---------- transport ---------- */
const transport: Record<string, JSX.Element> = {
  bus: (
    <>
      <rect x="20" y="28" width="80" height="54" rx="7" {...S} />
      <line x1="20" y1="50" x2="100" y2="50" {...ACCENT} />
      <circle cx="38" cy="90" r="8" {...S} />
      <circle cx="82" cy="90" r="8" {...S} />
    </>
  ),
  bike: (
    <>
      <circle cx="32" cy="76" r="18" {...S} />
      <circle cx="88" cy="76" r="18" {...S} />
      <path d="M32 76l18-30h20l-8 30" {...ACCENT} />
      <line x1="70" y1="46" x2="88" y2="76" {...ACCENT} />
      <line x1="62" y1="42" x2="80" y2="42" {...S} />
    </>
  ),
  walk: (
    <>
      <circle cx="62" cy="26" r="9" {...S} />
      <path d="M62 36v26" {...ACCENT} />
      <path d="M62 62l-12 32M62 62l14 30" {...S} />
      <path d="M62 44l-16 8M62 44l16 10" {...S} />
    </>
  ),
}

/* ---------- sport ---------- */
const sport: Record<string, JSX.Element> = {
  football: (
    <>
      <circle cx="60" cy="60" r="34" {...S} />
      <path d="M60 38l14 10-5 17H51l-5-17Z" {...ACCENT} />
      <line x1="60" y1="26" x2="60" y2="38" {...S} />
      <line x1="74" y1="48" x2="90" y2="42" {...S} />
      <line x1="69" y1="65" x2="79" y2="82" {...S} />
      <line x1="51" y1="65" x2="41" y2="82" {...S} />
      <line x1="46" y1="48" x2="30" y2="42" {...S} />
    </>
  ),
  tennis: (
    <>
      <ellipse cx="52" cy="46" rx="24" ry="28" transform="rotate(-30 52 46)" {...S} />
      <path d="M66 68l22 26" {...S} />
      <path d="M38 34l24 24M62 30l-22 30" {...ACCENT} strokeWidth={1.6} />
    </>
  ),
  swimming: (
    <>
      <circle cx="40" cy="40" r="9" {...S} />
      <path d="M50 52l20-8 18 14" {...ACCENT} />
      <path d="M18 74c8 0 8 6 16 6s8-6 16-6 8 6 16 6 8-6 16-6 8 6 16 6" {...S} />
      <path d="M18 92c8 0 8 6 16 6s8-6 16-6 8 6 16 6 8-6 16-6 8 6 16 6" {...S} />
    </>
  ),
}

/* ---------- hotel rooms ---------- */
function Bed({ x, w }: { x: number; w: number }) {
  return (
    <>
      <rect x={x} y={54} width={w} height={26} rx={3} {...S} />
      <rect x={x + 3} y={44} width={w - 6} height={12} rx={3} {...ACCENT} />
      <line x1={x} y1={80} x2={x} y2={90} {...S} />
      <line x1={x + w} y1={80} x2={x + w} y2={90} {...S} />
    </>
  )
}

const room: Record<string, JSX.Element> = {
  single: <Bed x={38} w={44} />,
  double: <Bed x={22} w={76} />,
  twin: (
    <>
      <Bed x={16} w={40} />
      <Bed x={64} w={40} />
    </>
  ),
}

/* ---------- food ---------- */
const food: Record<string, JSX.Element> = {
  pizza: (
    <>
      <path d="M60 20l38 66a4 4 0 0 1-3 6H25a4 4 0 0 1-3-6Z" {...S} />
      <circle cx="52" cy="66" r="5" {...ACCENT} />
      <circle cx="72" cy="72" r="5" {...ACCENT} />
      <circle cx="60" cy="48" r="4" {...ACCENT} />
    </>
  ),
  noodles: (
    <>
      <path d="M22 56h76a38 38 0 0 1-76 0Z" {...S} />
      <path d="M40 50c0-10 6-16 10-20M56 50c0-12 8-18 12-22M72 50c0-10 6-14 10-18" {...ACCENT} />
      <line x1="88" y1="34" x2="104" y2="24" {...S} />
      <line x1="82" y1="30" x2="98" y2="20" {...S} />
    </>
  ),
  salad: (
    <>
      <path d="M24 58h72a36 36 0 0 1-72 0Z" {...S} />
      <circle cx="46" cy="46" r="10" {...ACCENT} />
      <circle cx="66" cy="42" r="8" {...ACCENT} />
      <circle cx="80" cy="50" r="7" {...S} />
      <line x1="24" y1="92" x2="96" y2="92" {...S} />
    </>
  ),
}

const SETS: Record<string, Record<string, JSX.Element>> = {
  weather,
  place,
  object,
  transport,
  sport,
  room,
  food,
}

export function Scene({ spec, title }: Props) {
  const [kind, ...rest] = spec.split(':')
  const value = rest.join(':')

  if (kind === 'clock') {
    const [h, m] = value.split(':').map(Number)
    return <Clock h={h} m={m} />
  }

  const node = SETS[kind]?.[value]
  if (!node) {
    return (
      <Frame label={title ?? spec}>
        <rect x="24" y="24" width="72" height="72" rx="8" {...S} />
        <line x1="24" y1="24" x2="96" y2="96" {...S} />
      </Frame>
    )
  }

  return <Frame label={title ?? `${kind} ${value}`}>{node}</Frame>
}
