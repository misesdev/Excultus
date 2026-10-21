export interface Clock {
  /** Current time as an ISO-8601 string (UTC). */
  nowIso(): string;
  /** Current time in epoch milliseconds. */
  nowMs(): number;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMs: () => Date.now(),
};
