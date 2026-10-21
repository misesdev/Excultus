export const SLEEP_TIMER_MINUTES = [5, 15, 30, 45, 60, 90] as const;

export type SleepTimer =
  | { kind: 'duration'; endsAtMs: number; minutes: number }
  | { kind: 'end-of-track' };

export function createDurationTimer(minutes: number, nowMs: number): SleepTimer {
  return { kind: 'duration', minutes, endsAtMs: nowMs + minutes * 60 * 1000 };
}

export function isTimerExpired(timer: SleepTimer | undefined, nowMs: number): boolean {
  return timer?.kind === 'duration' && nowMs >= timer.endsAtMs;
}

export function remainingTimerMs(
  timer: SleepTimer | undefined,
  nowMs: number,
): number | undefined {
  return timer?.kind === 'duration' ? Math.max(0, timer.endsAtMs - nowMs) : undefined;
}
