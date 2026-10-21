import {
  isRemotelyPlayable,
  resolveAudioExtension,
  type AudioRepository,
} from '@features/audios';
import type { DownloadManager, DownloadRequest } from './DownloadManager';

export interface DownloadAudiosResult {
  enqueued: number;
  /** Audios without a downloadable source (e.g. YouTube links, restricted files). */
  unavailable: number;
}

/** Turns library audios into download requests (used by menus and "download all"). */
export function createDownloadCommands({
  manager,
  audios,
}: {
  manager: DownloadManager;
  audios: AudioRepository;
}) {
  return {
    async downloadAudios(audioIds: readonly string[]): Promise<DownloadAudiosResult> {
      const requests: DownloadRequest[] = [];
      let unavailable = 0;
      for (const audioId of audioIds) {
        const audio = await audios.findById(audioId);
        const extension =
          audio?.mediaUrl &&
          resolveAudioExtension({ fileName: audio.mediaUrl, mimeType: audio.mimeType });
        if (!audio || !audio.mediaUrl || !isRemotelyPlayable(audio) || !extension) {
          unavailable++;
          continue;
        }
        requests.push({
          audioId,
          url: audio.mediaUrl,
          fileExtension: extension,
          expectedBytes: audio.fileSize,
        });
      }
      const enqueued = requests.length > 0 ? await manager.enqueue(requests) : 0;
      return { enqueued, unavailable };
    },
  };
}

export type DownloadCommands = ReturnType<typeof createDownloadCommands>;
