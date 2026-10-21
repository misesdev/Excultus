import type { Unsubscribe } from '@core/types';
import type {
  FileDownloader,
  FileDownloaderEvent,
  FileDownloadFailureReason,
  FileDownloadRequest,
} from '@features/downloads';
import NativeExcultusDownloader from '../../../specs/NativeExcultusDownloader';

const FAILURE_REASONS: readonly FileDownloadFailureReason[] = [
  'network',
  'http',
  'storage',
  'io',
  'cancelled',
];

function optionalSize(value: number): number | undefined {
  return value >= 0 ? value : undefined;
}

/** Adapter over the Kotlin TurboModule (OkHttp streaming with Range resume). */
export class NativeFileDownloader implements FileDownloader {
  private readonly listeners = new Set<(event: FileDownloaderEvent) => void>();
  private nativeSubscriptions: Array<{ remove: () => void }> = [];

  start(request: FileDownloadRequest): Promise<void> {
    this.ensureSubscribed();
    return NativeExcultusDownloader.start(
      request.taskId,
      request.url,
      request.destinationPath,
    );
  }

  stop(taskId: string): Promise<void> {
    return NativeExcultusDownloader.stop(taskId);
  }

  subscribe(listener: (event: FileDownloaderEvent) => void): Unsubscribe {
    this.ensureSubscribed();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private ensureSubscribed(): void {
    if (this.nativeSubscriptions.length > 0) {
      return;
    }
    this.nativeSubscriptions = [
      NativeExcultusDownloader.onProgress(event =>
        this.emit({
          type: 'progress',
          taskId: event.taskId,
          bytesWritten: event.bytesWritten,
          totalBytes: optionalSize(event.totalBytes),
        }),
      ),
      NativeExcultusDownloader.onCompleted(event =>
        this.emit({
          type: 'completed',
          taskId: event.taskId,
          bytesWritten: event.bytesWritten,
          totalBytes: optionalSize(event.totalBytes),
          contentType: event.contentType || undefined,
        }),
      ),
      NativeExcultusDownloader.onFailed(event =>
        this.emit({
          type: 'failed',
          taskId: event.taskId,
          reason: FAILURE_REASONS.includes(event.reason as FileDownloadFailureReason)
            ? (event.reason as FileDownloadFailureReason)
            : 'io',
          httpStatus: event.httpStatus > 0 ? event.httpStatus : undefined,
          message: event.message,
        }),
      ),
    ];
  }

  private emit(event: FileDownloaderEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}
