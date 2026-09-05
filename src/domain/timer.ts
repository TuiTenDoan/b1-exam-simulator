export type TimerPhase = 'normal' | 'warning' | 'critical' | 'expired'

/** Last five minutes: the invigilator's "five minutes remaining" call. */
export const WARNING_AT_SECONDS = 300
/** Last minute: stop writing and check the answer sheet. */
export const CRITICAL_AT_SECONDS = 60

/**
 * Seconds left, derived from wall-clock stamps rather than a counter, so a
 * backgrounded tab or a dropped interval cannot hand back extra time.
 */
export function remainingAt(
  startedAt: number,
  allowanceSeconds: number,
  now: number,
): number {
  const elapsed = Math.floor((now - startedAt) / 1000)
  return Math.max(0, allowanceSeconds - elapsed)
}

export function phaseFor(remainingSeconds: number): TimerPhase {
  if (remainingSeconds <= 0) return 'expired'
  if (remainingSeconds <= CRITICAL_AT_SECONDS) return 'critical'
  if (remainingSeconds <= WARNING_AT_SECONDS) return 'warning'
  return 'normal'
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
