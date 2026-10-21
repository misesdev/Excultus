import type { Download, DownloadStatus } from '../entities/Download';

export interface DownloadListEntry {
  download: Download;
  title: string;
  artworkPath?: string;
}

export interface DownloadRepository {
  findById(id: string): Promise<Download | null>;
  findByAudioId(audioId: string): Promise<Download | null>;
  findByStatus(statuses: readonly DownloadStatus[]): Promise<Download[]>;
  /** Inserts or replaces the record (unique per audio). */
  save(download: Download): Promise<void>;
  updateProgress(
    id: string,
    bytesDownloaded: number,
    totalBytes: number | undefined,
    nowIso: string,
  ): Promise<void>;
  delete(id: string): Promise<void>;
  /** Downloads joined with their audio titles, for the downloads screen. */
  listEntries(): Promise<DownloadListEntry[]>;
  completedSizeBytes(): Promise<number>;
}
