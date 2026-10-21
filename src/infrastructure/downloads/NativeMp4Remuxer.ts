import type { DownloadedFileProcessor } from '@features/downloads';
import NativeExcultusDownloader from '../../../specs/NativeExcultusDownloader';

const MP4_EXTENSIONS: ReadonlySet<string> = new Set(['m4a', 'm4b']);

/**
 * Rewrites fragmented MP4 (DASH, as served by YouTube) into a regular MP4
 * natively, without re-encoding. Other files are left untouched.
 */
export class NativeMp4Remuxer implements DownloadedFileProcessor {
  process(path: string, fileExtension: string): Promise<boolean> {
    if (!MP4_EXTENSIONS.has(fileExtension)) {
      return Promise.resolve(false);
    }
    return NativeExcultusDownloader.remuxFragmentedMp4(path);
  }
}
