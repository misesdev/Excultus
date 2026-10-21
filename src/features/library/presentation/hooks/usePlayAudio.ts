import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { getUserMessage } from '@core/errors';
import type { AudioLibraryItem } from '@features/audios';
import { feedback } from '@shared/feedback/feedbackStore';

export interface PlayContext {
  /** Ordered list the item belongs to; playback continues through it. */
  queueIds?: readonly string[];
  label?: string;
}

/**
 * Starts playback for a library item. Links that can only be played at the
 * origin (YouTube) are opened externally instead.
 */
export function usePlayAudio() {
  const { player, logger } = useDependencies();

  return useCallback(
    async (item: AudioLibraryItem, context: PlayContext = {}) => {
      const { audio } = item;
      try {
        if (audio.sourceType === 'youtube') {
          if (audio.sourceUrl) {
            await Linking.openURL(audio.sourceUrl);
          }
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
    [logger, player],
  );
}
