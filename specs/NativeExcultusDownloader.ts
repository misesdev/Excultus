import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/** Sizes are doubles (JS numbers); -1 means "unknown". */
export type DownloadProgressEvent = {
  taskId: string;
  bytesWritten: number;
  totalBytes: number;
};

export type DownloadCompletedEvent = {
  taskId: string;
  bytesWritten: number;
  totalBytes: number;
  contentType: string;
};

export type DownloadFailedEvent = {
  taskId: string;
  /** network | http | storage | io | cancelled */
  reason: string;
  httpStatus: number;
  message: string;
};

export interface Spec extends TurboModule {
  start(taskId: string, url: string, destinationPath: string): Promise<void>;
  stop(taskId: string): Promise<void>;
  /** Rewrites a fragmented MP4 as a regular one in place; false when it was not fragmented. */
  remuxFragmentedMp4(path: string): Promise<boolean>;
  readonly onProgress: CodegenTypes.EventEmitter<DownloadProgressEvent>;
  readonly onCompleted: CodegenTypes.EventEmitter<DownloadCompletedEvent>;
  readonly onFailed: CodegenTypes.EventEmitter<DownloadFailedEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ExcultusDownloader');
