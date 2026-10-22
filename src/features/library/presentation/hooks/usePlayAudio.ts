import { useCallback } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { getUserMessage } from '@core/errors';
import { t } from '@core/i18n';
import { isDownloadable, type AudioLibraryItem } from '@features/audios';
import { feedback } from '@shared/feedback/feedbackStore';

export interface PlayContext {
  /** Ordered list the item belongs to; playback continues through it. */
  queueIds?: readonly string[];
  label?: string;
}

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
        feedback.error(t('play.linkOnlyPlaylistItem'));
        return;
      }
      switch (item.offline) {
        case 'queued':
        case 'downloading':
          feedback.info(t('play.stillDownloading'));
          return;
        case 'paused':
          await downloads.resume(audio.id);
          feedback.info(t('play.stillDownloading'));
          return;
        case 'failed':
          await downloads.retry(audio.id);
          feedback.info(t('play.retryingDownload'));
          return;
        default: {
          const result = await downloadCommands.downloadAudios([audio.id]);
          feedback.info(
            result.enqueued > 0 ? t('play.downloadingYouTube') : t('play.cannotDownload'),
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
