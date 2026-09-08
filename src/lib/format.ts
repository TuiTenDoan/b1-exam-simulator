/**
 * Number formatting for a Vietnamese interface.
 *
 * Vietnamese writes the decimal separator as a comma, so "3.5 điểm" is as
 * jarring on this page as "3,5 points" would be in English. The app was mixing
 * the two — some marks hand-written as "4,0", the rest coming out of toFixed as
 * "3.5" — which read as a bug even though the arithmetic was right.
 */

/** A mark or score, e.g. mark(3.5) -> "3,5". */
export function mark(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(digits).replace('.', ',')
}
