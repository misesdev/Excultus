export type StorageArea = 'audio' | 'artwork' | 'temp' | 'exports';

export interface StoredFile {
  path: string;
  name: string;
  sizeBytes: number;
}

/**
 * Port over the app-controlled file system. Every path handed out by this
 * port lives inside a directory owned by the application; physical file
 * names derive from internal stable IDs, never from user/source titles.
 */
export interface FileStorage {
  ensureDirectories(): Promise<void>;

  audioFilePath(audioId: string, extension: string): string;
  tempFilePath(downloadId: string): string;
  artworkFilePath(artworkId: string, extension: string): string;
  exportFilePath(fileName: string): string;
  /** Converts an absolute path into a URI understood by native players/images. */
  toFileUri(path: string): string;

  exists(path: string): Promise<boolean>;
  /** Size in bytes, or null when the file does not exist. */
  fileSize(path: string): Promise<number | null>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  /** Removes a file; resolves silently when the file is already absent. */
  remove(path: string): Promise<void>;
  md5(path: string): Promise<string>;
  freeSpaceBytes(): Promise<number>;
  listFiles(area: StorageArea): Promise<StoredFile[]>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  /** Downloads a small file (e.g. artwork) directly to `path`. */
  downloadSmallFile(url: string, path: string): Promise<void>;
}
