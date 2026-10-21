import type { Download } from '../entities/Download';

/** Extra space kept free so the device never runs completely out of storage. */
export const STORAGE_SAFETY_MARGIN_BYTES = 100 * 1024 * 1024;

/**
 * Picks the queued downloads that may start now, FIFO by creation time,
 * respecting the concurrency limit.
 */
export function selectDownloadsToStart(
  downloads: readonly Download[],
  maxConcurrent: number,
): Download[] {
  const running = downloads.filter(d => d.status === 'downloading').length;
  const slots = Math.max(0, maxConcurrent - running);
  if (slots === 0) {
    return [];
  }
  return downloads
    .filter(d => d.status === 'queued')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, slots);
}

/** Bytes still needed to finish a download (unknown size counts as zero). */
export function remainingBytes(
  download: Pick<Download, 'bytesDownloaded' | 'totalBytes'>,
): number {
  if (!download.totalBytes) {
    return 0;
  }
  return Math.max(0, download.totalBytes - download.bytesDownloaded);
}

export function hasEnoughSpace(freeBytes: number, requiredBytes: number): boolean {
  return freeBytes - requiredBytes >= STORAGE_SAFETY_MARGIN_BYTES;
}

export type IntegrityResult =
  | { valid: true }
  | { valid: false; reason: 'empty' | 'size-mismatch' | 'checksum-mismatch' };

/**
 * Validates a finished file before it becomes part of the library.
 * Checksum is optional because not every source publishes one.
 */
export function checkIntegrity(params: {
  actualBytes: number;
  expectedBytes?: number;
  actualMd5?: string;
  expectedMd5?: string;
}): IntegrityResult {
  if (params.actualBytes <= 0) {
    return { valid: false, reason: 'empty' };
  }
  if (params.expectedBytes !== undefined && params.expectedBytes !== params.actualBytes) {
    return { valid: false, reason: 'size-mismatch' };
  }
  if (
    params.expectedMd5 &&
    params.actualMd5 &&
    params.expectedMd5.toLowerCase() !== params.actualMd5.toLowerCase()
  ) {
    return { valid: false, reason: 'checksum-mismatch' };
  }
  return { valid: true };
}

export interface AggregateProgress {
  activeCount: number;
  bytesDownloaded: number;
  totalBytes: number;
  ratio: number;
}

export function aggregateProgress(
  downloads: ReadonlyArray<Pick<Download, 'status' | 'bytesDownloaded' | 'totalBytes'>>,
): AggregateProgress {
  const active = downloads.filter(
    d => d.status === 'queued' || d.status === 'downloading' || d.status === 'paused',
  );
  const bytesDownloaded = active.reduce((sum, d) => sum + d.bytesDownloaded, 0);
  const totalBytes = active.reduce((sum, d) => sum + (d.totalBytes ?? 0), 0);
  return {
    activeCount: active.length,
    bytesDownloaded,
    totalBytes,
    ratio: totalBytes > 0 ? Math.min(1, bytesDownloaded / totalBytes) : 0,
  };
}
