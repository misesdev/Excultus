import { ValidationError } from '@core/errors';

export const DOWNLOAD_STATUSES = [
  'queued',
  'downloading',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;
export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[number];

export type DownloadErrorCode =
  | 'network'
  | 'http'
  | 'insufficient-storage'
  | 'integrity'
  | 'io'
  | 'file-missing';

/**
 * Persistent download record. At most one record exists per audio, which is
 * what prevents duplicate downloads and duplicate files.
 */
export interface Download {
  id: string;
  audioId: string;
  url: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes?: number;
  expectedMd5?: string;
  fileExtension: string;
  /** Partial file written while downloading; moved after validation. */
  tempPath: string;
  /** Final validated file; only meaningful when status is "completed". */
  localPath?: string;
  attempts: number;
  errorCode?: DownloadErrorCode;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  verifiedAt?: string;
}

const TRANSITIONS: Record<DownloadStatus, readonly DownloadStatus[]> = {
  queued: ['downloading', 'paused', 'cancelled', 'failed'],
  downloading: ['completed', 'failed', 'paused', 'cancelled', 'queued'],
  paused: ['queued', 'cancelled'],
  failed: ['queued', 'cancelled'],
  cancelled: ['queued'],
  // A completed download can only become "failed" when its file goes missing.
  completed: ['failed'],
};

export function canTransition(from: DownloadStatus, to: DownloadStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(
  download: Download,
  to: DownloadStatus,
  nowIso: string,
  changes: Partial<Omit<Download, 'id' | 'audioId' | 'status'>> = {},
): Download {
  if (!canTransition(download.status, to)) {
    throw new ValidationError(
      `Invalid download transition ${download.status} -> ${to}`,
      'status',
    );
  }
  const next: Download = { ...download, ...changes, status: to, updatedAt: nowIso };
  if (to !== 'failed') {
    next.errorCode = changes.errorCode;
    next.errorMessage = changes.errorMessage;
  }
  return next;
}

export const isActiveStatus = (status: DownloadStatus) =>
  status === 'queued' || status === 'downloading' || status === 'paused';

export const canPause = (status: DownloadStatus) =>
  status === 'queued' || status === 'downloading';
export const canResume = (status: DownloadStatus) => status === 'paused';
export const canRetry = (status: DownloadStatus) =>
  status === 'failed' || status === 'cancelled';
export const canCancel = (status: DownloadStatus) =>
  isActiveStatus(status) || status === 'failed';

export function downloadProgress(
  download: Pick<Download, 'bytesDownloaded' | 'totalBytes' | 'status'>,
): number {
  if (download.status === 'completed') {
    return 1;
  }
  if (!download.totalBytes || download.totalBytes <= 0) {
    return 0;
  }
  return Math.min(1, download.bytesDownloaded / download.totalBytes);
}

/** Failures worth retrying automatically (transient by nature). */
export function isRetryableError(code: DownloadErrorCode, httpStatus?: number): boolean {
  if (code === 'network' || code === 'io') {
    return true;
  }
  if (code === 'http') {
    return (
      httpStatus === undefined ||
      httpStatus >= 500 ||
      httpStatus === 408 ||
      httpStatus === 429
    );
  }
  return false;
}

const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 60000;

/** Exponential backoff: 2s, 4s, 8s... capped at one minute. */
export function retryDelayMs(attempt: number): number {
  return Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
  );
}
