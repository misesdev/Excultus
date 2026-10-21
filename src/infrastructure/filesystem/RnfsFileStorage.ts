import * as RNFS from '@dr.pogodin/react-native-fs';
import type { FileStorage, StorageArea, StoredFile } from '@core/application';
import { FileNotFoundError, NetworkError, PermissionDeniedError } from '@core/errors';
import { parseHttpsUrl } from '@core/utils';

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]{1,120}$/;
const SAFE_EXTENSION = /^[a-z0-9]{1,8}$/;

/**
 * Guards every generated path: names must be internal identifiers, which
 * rules out path traversal ("../") and characters the file system rejects.
 */
function assertSafe(segment: string, kind: 'name' | 'extension'): string {
  const pattern = kind === 'name' ? SAFE_SEGMENT : SAFE_EXTENSION;
  if (!pattern.test(segment)) {
    throw new PermissionDeniedError(`Unsafe file ${kind}`, {
      details: { segment: segment.slice(0, 40) },
    });
  }
  return segment;
}

/** Sanitizes a user/system provided file name for app-owned copies. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\- ]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(-120);
  return cleaned.length > 0 ? cleaned : 'file';
}

/** File storage confined to the app's private directories (no permissions needed). */
export class RnfsFileStorage implements FileStorage {
  private readonly roots: Record<StorageArea, string>;

  constructor(
    documentDirectory: string = RNFS.DocumentDirectoryPath,
    cacheDirectory: string = RNFS.CachesDirectoryPath,
  ) {
    const library = `${documentDirectory}/library`;
    this.roots = {
      audio: `${library}/audio`,
      artwork: `${library}/artwork`,
      temp: `${library}/tmp`,
      exports: `${cacheDirectory}/exports`,
    };
  }

  async ensureDirectories(): Promise<void> {
    for (const directory of Object.values(this.roots)) {
      if (!(await RNFS.exists(directory))) {
        await RNFS.mkdir(directory);
      }
    }
  }

  audioFilePath(audioId: string, extension: string): string {
    return `${this.roots.audio}/${assertSafe(audioId, 'name')}.${assertSafe(
      extension,
      'extension',
    )}`;
  }

  tempFilePath(downloadId: string): string {
    return `${this.roots.temp}/${assertSafe(downloadId, 'name')}.part`;
  }

  artworkFilePath(artworkId: string, extension: string): string {
    return `${this.roots.artwork}/${assertSafe(artworkId, 'name')}.${assertSafe(
      extension,
      'extension',
    )}`;
  }

  exportFilePath(fileName: string): string {
    return `${this.roots.exports}/${sanitizeFileName(fileName)}`;
  }

  toFileUri(path: string): string {
    return path.startsWith('file://') ? path : `file://${path}`;
  }

  exists(path: string): Promise<boolean> {
    return RNFS.exists(path);
  }

  async fileSize(path: string): Promise<number | null> {
    if (!(await RNFS.exists(path))) {
      return null;
    }
    return Number((await RNFS.stat(path)).size);
  }

  async move(from: string, to: string): Promise<void> {
    await this.requireFile(from);
    if (await RNFS.exists(to)) {
      await RNFS.unlink(to);
    }
    await RNFS.moveFile(from, to);
  }

  async copy(from: string, to: string): Promise<void> {
    await this.requireFile(from);
    if (await RNFS.exists(to)) {
      await RNFS.unlink(to);
    }
    await RNFS.copyFile(from, to);
  }

  async remove(path: string): Promise<void> {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  }

  async md5(path: string): Promise<string> {
    await this.requireFile(path);
    return RNFS.hash(path, 'md5');
  }

  async freeSpaceBytes(): Promise<number> {
    return Number((await RNFS.getFSInfo()).freeSpace);
  }

  async listFiles(area: StorageArea): Promise<StoredFile[]> {
    const directory = this.roots[area];
    if (!(await RNFS.exists(directory))) {
      return [];
    }
    const entries = await RNFS.readDir(directory);
    return entries
      .filter(entry => entry.isFile())
      .map(entry => ({
        path: entry.path,
        name: entry.name,
        sizeBytes: Number(entry.size),
      }));
  }

  async readText(path: string): Promise<string> {
    await this.requireFile(path);
    return RNFS.readFile(path, 'utf8');
  }

  writeText(path: string, content: string): Promise<void> {
    return RNFS.writeFile(path, content, 'utf8');
  }

  async downloadSmallFile(url: string, path: string): Promise<void> {
    if (!parseHttpsUrl(url)) {
      throw new PermissionDeniedError('Only HTTPS downloads are allowed', {
        details: { url },
      });
    }
    const result = await RNFS.downloadFile({ fromUrl: url, toFile: path }).promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      await this.remove(path);
      throw new NetworkError(`Download failed with HTTP ${result.statusCode}`, {
        details: { status: result.statusCode },
      });
    }
  }

  private async requireFile(path: string): Promise<void> {
    if (!(await RNFS.exists(path))) {
      throw new FileNotFoundError('File not found', { details: { path } });
    }
  }
}
