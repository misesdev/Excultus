import {
  canCancel,
  canPause,
  canResume,
  canRetry,
  downloadProgress,
  isRetryableError,
  retryDelayMs,
  transition,
  type Download,
} from '../entities/Download';
import {
  aggregateProgress,
  checkIntegrity,
  hasEnoughSpace,
  remainingBytes,
  selectDownloadsToStart,
  STORAGE_SAFETY_MARGIN_BYTES,
} from '../policies/downloadPolicies';

const base: Download = {
  id: 'd1',
  audioId: 'a1',
  url: 'https://example.org/a.mp3',
  status: 'queued',
  bytesDownloaded: 0,
  totalBytes: 100,
  fileExtension: 'mp3',
  tempPath: '/tmp/d1.part',
  attempts: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const make = (overrides: Partial<Download>): Download => ({ ...base, ...overrides });

describe('download state machine', () => {
  it('allows valid transitions and rejects invalid ones', () => {
    const running = transition(base, 'downloading', 'now');
    expect(running.status).toBe('downloading');
    expect(transition(running, 'paused', 'now').status).toBe('paused');
    expect(() => transition(make({ status: 'completed' }), 'downloading', 'now')).toThrow(
      /Invalid download transition/,
    );
    expect(() => transition(make({ status: 'paused' }), 'completed', 'now')).toThrow();
  });

  it('clears error details when leaving the failed state', () => {
    const failed = transition(make({ status: 'downloading' }), 'failed', 'now', {
      errorCode: 'network',
      errorMessage: 'x',
    });
    expect(failed.errorCode).toBe('network');
    const retried = transition(failed, 'queued', 'later');
    expect(retried.errorCode).toBeUndefined();
    expect(retried.updatedAt).toBe('later');
  });

  it('exposes command guards per status', () => {
    expect(canPause('downloading')).toBe(true);
    expect(canPause('completed')).toBe(false);
    expect(canResume('paused')).toBe(true);
    expect(canRetry('failed')).toBe(true);
    expect(canRetry('downloading')).toBe(false);
    expect(canCancel('completed')).toBe(false);
  });

  it('computes progress and remaining bytes', () => {
    expect(downloadProgress(make({ bytesDownloaded: 25 }))).toBe(0.25);
    expect(downloadProgress(make({ totalBytes: undefined, bytesDownloaded: 10 }))).toBe(
      0,
    );
    expect(downloadProgress(make({ status: 'completed' }))).toBe(1);
    expect(remainingBytes(make({ bytesDownloaded: 40 }))).toBe(60);
  });

  it('classifies retryable failures and backs off exponentially', () => {
    expect(isRetryableError('network')).toBe(true);
    expect(isRetryableError('http', 503)).toBe(true);
    expect(isRetryableError('http', 404)).toBe(false);
    expect(isRetryableError('insufficient-storage')).toBe(false);
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(3)).toBe(8000);
    expect(retryDelayMs(20)).toBe(60000);
  });
});

describe('download policies', () => {
  it('starts queued downloads FIFO within the concurrency limit', () => {
    const list = [
      make({ id: 'running', status: 'downloading' }),
      make({ id: 'second', createdAt: '2026-01-02T00:00:00.000Z' }),
      make({ id: 'first', createdAt: '2026-01-01T00:00:00.000Z' }),
      make({ id: 'paused', status: 'paused' }),
    ];
    expect(selectDownloadsToStart(list, 2).map(d => d.id)).toEqual(['first']);
    expect(selectDownloadsToStart(list, 3).map(d => d.id)).toEqual(['first', 'second']);
    expect(selectDownloadsToStart(list, 1)).toEqual([]);
  });

  it('keeps a safety margin of free space', () => {
    expect(hasEnoughSpace(STORAGE_SAFETY_MARGIN_BYTES + 100, 100)).toBe(true);
    expect(hasEnoughSpace(STORAGE_SAFETY_MARGIN_BYTES + 99, 100)).toBe(false);
  });

  it('validates size and checksum', () => {
    expect(checkIntegrity({ actualBytes: 0 })).toEqual({ valid: false, reason: 'empty' });
    expect(checkIntegrity({ actualBytes: 10, expectedBytes: 11 })).toEqual({
      valid: false,
      reason: 'size-mismatch',
    });
    expect(
      checkIntegrity({ actualBytes: 10, expectedMd5: 'AB', actualMd5: 'ab' }),
    ).toEqual({ valid: true });
    expect(
      checkIntegrity({ actualBytes: 10, expectedMd5: 'ab', actualMd5: 'cd' }),
    ).toEqual({
      valid: false,
      reason: 'checksum-mismatch',
    });
  });

  it('aggregates progress of active downloads only', () => {
    const result = aggregateProgress([
      make({ status: 'downloading', bytesDownloaded: 50, totalBytes: 100 }),
      make({ status: 'queued', bytesDownloaded: 0, totalBytes: 100 }),
      make({ status: 'completed', bytesDownloaded: 999, totalBytes: 999 }),
    ]);
    expect(result).toEqual({
      activeCount: 2,
      bytesDownloaded: 50,
      totalBytes: 200,
      ratio: 0.25,
    });
  });
});
