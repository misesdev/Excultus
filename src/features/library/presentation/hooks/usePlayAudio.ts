import { useCallback } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { getUserMessage } from '@core/errors';
import { isDownloadable, type AudioLibraryItem } from '@features/audios';
import { feedback } from '@shared/feedback/feedbackStore';

export interface PlayContext {
  /** Ordered list the item belongs to; playback continues through it. */
  queueIds?: readonly string[];
  label?: string;
}

const STILL_DOWNLOADING =
  'O áudio ainda está sendo baixado. Toque de novo quando o download terminar.';

/**
 * Starts playback for a library item. YouTube audio only plays from its
 * downloaded file, so a missing file starts (or resumes) its download instead.
 */
export function usePlayAudio() {
  const { player, downloads, downloadCommands, logger } = useDependencies();

  const ensureDownloaded = useCallback(
    async (item: AudioLibraryItem): Promise<void> => {
      const { audio } = item;
      if (!isDownloadable(audio)) {
        feedback.error(
          'Este item guarda só o link de uma playlist do YouTube. Importe a playlist de novo para baixar os áudios.',
        );
        return;
      }
      switch (item.offline) {
        case 'queued':
        case 'downloading':
          feedback.info(STILL_DOWNLOADING);
          return;
        case 'paused':
          await downloads.resume(audio.id);
          feedback.info(STILL_DOWNLOADING);
          return;
        case 'failed':
          await downloads.retry(audio.id);
          feedback.info('Tentando baixar o áudio de novo…');
          return;
        default: {
          const result = await downloadCommands.downloadAudios([audio.id]);
          feedback.info(
            result.enqueued > 0
              ? 'Baixando o áudio do YouTube. Toque de novo quando o download terminar.'
              : 'Este áudio não pode ser baixado.',
          );
        }
      }
    },
    [downloadCommands, downloads],
  );

  return useCallback(
    async (item: AudioLibraryItem, context: PlayContext = {}) => {
      const { audio } = item;
      try {
        if (audio.sourceType === 'youtube' && item.offline !== 'available') {
          await ensureDownloaded(item);
          return;
        }
        const queue =
          context.queueIds && context.queueIds.includes(audio.id)
            ? context.queueIds
            : [audio.id];
        await player.playQueue(queue, queue.indexOf(audio.id), {
          contextLabel: context.label,
        });
      } catch (error) {
        logger.error('ui.play_failed', { audioId: audio.id }, error);
        feedback.error(getUserMessage(error));
      }
    },
    [ensureDownloaded, logger, player],
  );
}
