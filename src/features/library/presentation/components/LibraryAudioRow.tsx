import React, { memo } from 'react';
import type { AudioLibraryItem } from '@features/audios';
import {
  AudioListItem,
  openAudioActions,
  type AudioActionContext,
  type AudioListItemProps,
} from '@features/audios/presentation';
import { DownloadStatusIndicator } from '@features/downloads/presentation';
import { useNowPlayingState } from '@features/player/presentation';

export interface LibraryAudioRowProps
  extends Pick<AudioListItemProps, 'trailing' | 'leading' | 'selected' | 'testID'> {
  item: AudioLibraryItem;
  onPress: (item: AudioLibraryItem) => void;
  actionContext?: AudioActionContext;
  /** Disables the contextual menu (e.g. selection mode). */
  hideActions?: boolean;
}

/** Audio row wired to live playback/download state and the global actions menu. */
function LibraryAudioRowComponent({
  item,
  onPress,
  actionContext,
  hideActions = false,
  ...rest
}: LibraryAudioRowProps) {
  const nowPlaying = useNowPlayingState(item.audio.id);
  return (
    <AudioListItem
      {...rest}
      item={item}
      nowPlaying={nowPlaying}
      onPress={() => onPress(item)}
      onMore={hideActions ? undefined : () => openAudioActions(item, actionContext)}
      statusAccessory={
        <DownloadStatusIndicator audioId={item.audio.id} offline={item.offline} />
      }
    />
  );
}

export const LibraryAudioRow = memo(LibraryAudioRowComponent);
