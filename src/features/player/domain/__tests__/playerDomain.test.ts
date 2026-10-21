import { buildProgress, isCompleted, resumePosition } from '../entities/PlaybackProgress';
import {
  createQueue,
  currentAudioId,
  enqueue,
  moveTo,
  nextPosition,
  orderedIds,
  playNext,
  previousPosition,
  removeAudio,
  setShuffle,
} from '../entities/PlaybackQueue';
import {
  createDurationTimer,
  isTimerExpired,
  remainingTimerMs,
} from '../entities/SleepTimer';

describe('PlaybackQueue', () => {
  it('starts at the requested item and removes duplicates', () => {
    const queue = createQueue(['a', 'b', 'a', 'c'], 1);
    expect(orderedIds(queue)).toEqual(['a', 'b', 'c']);
    expect(currentAudioId(queue)).toBe('b');
  });

  it('advances sequentially and honors repeat modes', () => {
    const queue = moveTo(createQueue(['a', 'b', 'c']), 2);
    expect(nextPosition(queue, 'off')).toBeNull();
    expect(nextPosition(queue, 'all')).toBe(0);
    expect(previousPosition(createQueue(['a', 'b']), 'off')).toBeNull();
    expect(previousPosition(createQueue(['a', 'b']), 'all')).toBe(1);
  });

  it('shuffles upcoming items keeping the current one first, and restores order', () => {
    let seed = 0.9;
    const random = () => (seed = (seed * 7) % 1);
    const queue = createQueue(['a', 'b', 'c', 'd', 'e'], 2);
    const shuffled = setShuffle(queue, true, random);
    expect(currentAudioId(shuffled)).toBe('c');
    expect(shuffled.position).toBe(0);
    expect([...orderedIds(shuffled)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    const restored = setShuffle(shuffled, false, random);
    expect(orderedIds(restored)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(currentAudioId(restored)).toBe('c');
  });

  it('enqueues at the end and inserts "play next" after the current item', () => {
    const queue = createQueue(['a', 'b', 'c']);
    expect(orderedIds(enqueue(queue, ['d', 'a']))).toEqual(['a', 'b', 'c', 'd']);
    expect(orderedIds(playNext(queue, ['c', 'x']))).toEqual(['a', 'c', 'x', 'b']);
    expect(currentAudioId(playNext(queue, ['c']))).toBe('a');
  });

  it('removes items without touching the current one', () => {
    const queue = moveTo(createQueue(['a', 'b', 'c']), 2);
    const removed = removeAudio(queue, 'a');
    expect(orderedIds(removed)).toEqual(['b', 'c']);
    expect(currentAudioId(removed)).toBe('c');
    expect(removeAudio(queue, 'c')).toBe(queue);
  });
});

describe('PlaybackProgress', () => {
  it('applies the configurable completion threshold', () => {
    expect(isCompleted(95000, 100000, 0.95)).toBe(true);
    expect(isCompleted(94000, 100000, 0.95)).toBe(false);
    expect(isCompleted(99999, 100000, 1)).toBe(true);
    expect(isCompleted(50000, undefined, 0.95)).toBe(false);
  });

  it('builds a clamped progress record', () => {
    const progress = buildProgress({
      audioId: 'a',
      positionMs: 120000.4,
      durationMs: 100000,
      threshold: 0.95,
      nowIso: 'now',
    });
    expect(progress).toEqual({
      audioId: 'a',
      positionMs: 100000,
      durationMs: 100000,
      completed: true,
      lastPlayedAt: 'now',
    });
    expect(
      buildProgress({
        audioId: 'a',
        positionMs: 10,
        threshold: 0.95,
        nowIso: 'n',
        reachedEnd: true,
      }).completed,
    ).toBe(true);
  });

  it('resumes with a short rewind unless completed, barely started or disabled', () => {
    const saved = {
      audioId: 'a',
      positionMs: 60000,
      completed: false,
      lastPlayedAt: 'x',
    };
    expect(resumePosition(saved, true)).toBe(58000);
    expect(resumePosition(saved, false)).toBe(0);
    expect(resumePosition({ ...saved, completed: true }, true)).toBe(0);
    expect(resumePosition({ ...saved, positionMs: 3000 }, true)).toBe(0);
    expect(resumePosition(null, true)).toBe(0);
  });
});

describe('SleepTimer', () => {
  it('expires after the chosen duration', () => {
    const timer = createDurationTimer(15, 1000);
    expect(remainingTimerMs(timer, 1000)).toBe(900000);
    expect(isTimerExpired(timer, 900999)).toBe(false);
    expect(isTimerExpired(timer, 901000)).toBe(true);
    expect(isTimerExpired({ kind: 'end-of-track' }, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});
