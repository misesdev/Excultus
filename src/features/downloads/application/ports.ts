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

export interface DownloadRuntimeConfig {
  maxConcurrent: number;
  wifiOnly: boolean;
  autoRetryAttempts: number;
}
