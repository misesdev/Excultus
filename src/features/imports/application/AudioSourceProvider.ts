import type { SourceType } from '@features/audios';

/** How the app can obtain the media for an item. */
export type AcquisitionMethod =
  /** Public file that may be downloaded for offline use (and streamed). */
  | { kind: 'download'; url: string; expectedMd5?: string }
  /** Device file already copied into app storage by the picker. */
  | { kind: 'copy'; localPath: string; sourceUri: string }
  /** Nothing can be obtained (restricted items, which are never imported). */
  | { kind: 'none' };

export type ItemAvailability =
  | 'available'
  /** Listed by the source but private/restricted: never imported. */
  | 'restricted';

export interface SourceMetadata {
  sourceType: SourceType;
  /** Stable identifier of the item inside the source (e.g. Archive identifier). */
  sourceId: string;
  title: string;
  description?: string;
  creator?: string;
  artworkUrl?: string;
  originalUrl: string;
  license?: string;
  /** Selected original fields, preserved for reference. */
  extra?: Record<string, string>;
}

export interface SourceAudioItem {
  /** Stable identifier of the file inside the source; used for deduplication. */
  sourceId: string;
  title: string;
  artist?: string;
  album?: string;
  description?: string;
  durationMs?: number;
  sizeBytes?: number;
  mimeType?: string;
  fileExtension?: string;
  trackNumber?: number;
  fileName?: string;
  sourceUrl?: string;
  /** Direct media URL usable for streaming, when the source allows it. */
  mediaUrl?: string;
  availability: ItemAvailability;
  acquisition: AcquisitionMethod;
}

/**
 * Contract every URL-based content source implements (Strategy pattern).
 * Metadata discovery is separate from file listing, so a provider can fetch
 * lightweight metadata first and the file list on demand.
 */
export interface AudioSourceProvider {
  readonly id: string;
  readonly label: string;
  canHandle(url: string): boolean;
  getMetadata(url: string): Promise<SourceMetadata>;
  getAudioItems(url: string): Promise<SourceAudioItem[]>;
}

/** Contract for importing files from the device (LocalFileProvider). */
export interface LocalAudioSource {
  pickAudioFiles(): Promise<{
    metadata: SourceMetadata;
    items: SourceAudioItem[];
    rejected: string[];
  }>;
}
