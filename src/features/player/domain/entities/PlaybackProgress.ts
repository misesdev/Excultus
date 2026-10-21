export interface PlaybackProgress {
  audioId: string;
  positionMs: number;
  durationMs?: number;
  completed: boolean;
  lastPlayedAt: string;
}

/** Below this position a track is considered "not started" for resume purposes. */
export const MIN_RESUME_POSITION_MS = 5000;
/** When resuming, rewind slightly so the listener regains context. */
export const RESUME_REWIND_MS = 2000;

/**
 * Configurable completion policy: an audio is completed when the position
 * reaches `threshold` of its duration (or the end was reached).
 */
export function isCompleted(
  positionMs: number,
  durationMs: number | undefined,
  threshold: number,
): boolean {
  if (!durationMs || durationMs <= 0) {
    return false;
  }
  return positionMs >= durationMs * Math.min(1, Math.max(0, threshold)) - 1;
}

export function buildProgress(params: {
  audioId: string;
  positionMs: number;
  durationMs?: number;
  threshold: number;
  nowIso: string;
  reachedEnd?: boolean;
}): PlaybackProgress {
  const positionMs = Math.max(0, Math.round(params.positionMs));
  const durationMs =
    params.durationMs && params.durationMs > 0
      ? Math.round(params.durationMs)
      : undefined;
  return {
    audioId: params.audioId,
    positionMs: durationMs ? Math.min(positionMs, durationMs) : positionMs,
    durationMs,
    completed:
      params.reachedEnd === true || isCompleted(positionMs, durationMs, params.threshold),
    lastPlayedAt: params.nowIso,
  };
}

/** Position to start from when an audio is played again. */
export function resumePosition(
  progress: PlaybackProgress | null,
  autoResume: boolean,
): number {
  if (
    !progress ||
    !autoResume ||
    progress.completed ||
    progress.positionMs < MIN_RESUME_POSITION_MS
  ) {
    return 0;
  }
  return Math.max(0, progress.positionMs - RESUME_REWIND_MS);
}
