import type { Unsubscribe } from '@core/types';

export interface FileDownloadRequest {
  taskId: string;
  url: string;
  /**
   * Partial file. When it already exists, the downloader resumes with an
   * HTTP Range request and appends; if the server ignores the range it
   * restarts from zero.
   */
  destinationPath: string;
}

export type FileDownloadFailureReason =
  | 'network'
  | 'http'
  | 'storage'
  | 'io'
  | 'cancelled';

export type FileDownloaderEvent =
  | { type: 'progress'; taskId: string; bytesWritten: number; totalBytes?: number }
  | {
      type: 'completed';
      taskId: string;
      bytesWritten: number;
      totalBytes?: number;
      contentType?: string;
    }
  | {
      type: 'failed';
      taskId: string;
      reason: FileDownloadFailureReason;
      httpStatus?: number;
      message: string;
    };

/** Port over the native (background-thread) HTTP file downloader. */
export interface FileDownloader {
  start(request: FileDownloadRequest): Promise<void>;
  /** Stops a running task, keeping the partial file for a later resume. */
  stop(taskId: string): Promise<void>;
  subscribe(listener: (event: FileDownloaderEvent) => void): Unsubscribe;
}

export interface ResolvedMediaUrl {
  url: string;
  /** Size announced by the source, when known. */
  totalBytes?: number;
}

/**
 * Turns a stored download URL into a fetchable one right before a transfer
 * starts. Sources whose media URLs expire (YouTube) store a stable page URL
 * and are resolved here; any other URL is returned unchanged.
 */
export interface MediaUrlResolver {
  resolve(url: string): Promise<ResolvedMediaUrl>;
}

/**
 * Last step on a validated file before it becomes available, e.g. rewriting
 * streaming-only containers into a format local players seek well in.
 */
export interface DownloadedFileProcessor {
  /** Returns true when the file was rewritten in place. */
  process(path: string, fileExtension: string): Promise<boolean>;
}

export interface DownloadRuntimeConfig {
  maxConcurrent: number;
  wifiOnly: boolean;
  autoRetryAttempts: number;
}
