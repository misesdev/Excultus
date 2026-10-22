import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppDialog, type AppMenuAction, useTranslation } from '@design-system';
import { isDownloadable, type AudioLibraryItem } from '@features/audios';
import {
  AudioActionsMenu,
  useAudioActionsStore,
  type AudioActionContext,
} from '@features/audios/presentation';
import { useActiveDownload } from '@features/downloads/presentation';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { usePlayAudio } from '../hooks/usePlayAudio';
import { TargetPickerSheet, type TargetKind } from './TargetPickerSheet';

/**
 * Single host for the audio actions menu (opened from any list or the
 * player). It builds context-aware actions and runs them through use cases.
 */
export function AudioActionsHost() {
  const { t } = useTranslation();
  const request = useAudioActionsStore(state => state.request);
  const close = useAudioActionsStore(state => state.close);
  const [picker, setPicker] = useState<{ kind: TargetKind; audioId: string } | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<AudioLibraryItem | null>(null);
  const {
    audios,
    collections,
    playlists,
    player,
    progress,
    downloads,
    downloadCommands,
  } = useDependencies();
  const playAudio = usePlayAudio();
  const live = useActiveDownload(request?.item.audio.id ?? '');
  const run = useAsyncAction(async (task: () => Promise<unknown>) => {
    await task();
  });
  const deleteAudio = useAsyncAction(
    (audioId: string) => audios.deleteFromLibrary(audioId),
    {
      successMessage: t('audioActions.removedFromLibrary'),
    },
  );

  const actions = request ? buildActions(request.item, request.context) : [];

  function buildActions(
    item: AudioLibraryItem,
    context: AudioActionContext,
  ): AppMenuAction[] {
    const { audio } = item;
    const list: AppMenuAction[] = [];
    const downloadable = isDownloadable(audio);
    // YouTube audio only plays from its downloaded file.
    const queueable = audio.sourceType !== 'youtube' || item.offline === 'available';
    const status = live?.status;

    if (!context.fromPlayer) {
      list.push({
        key: 'play',
        label: t('audioActions.play'),
        icon: 'play',
        onPress: () =>
          playAudio(item, { queueIds: context.queueIds, label: context.queueLabel }),
      });
    }
    if (queueable) {
      list.push(
        {
          key: 'play-next',
          label: t('audioActions.playNext'),
          icon: 'return-down-forward',
          onPress: () =>
            run
              .run(() => player.playNext([audio.id]))
              .then(() => feedback.info(t('audioActions.playingNext'))),
        },
        {
          key: 'queue',
          label: t('audioActions.addToQueue'),
          icon: 'list',
          onPress: () =>
            run
              .run(() => player.addToQueue([audio.id]))
              .then(() => feedback.info(t('audioActions.addedToQueue'))),
        },
      );
    }
    list.push({
      key: 'favorite',
      label: item.isFavorite
        ? t('audioActions.removeFavorite')
        : t('audioActions.addFavorite'),
      icon: item.isFavorite ? 'heart-dislike-outline' : 'heart-outline',
      onPress: () => run.run(() => audios.toggleFavorite(audio.id)),
    });

    if (status === 'downloading' || status === 'queued') {
      list.push({
        key: 'pause-download',
        label: t('audioActions.pauseDownload'),
        icon: 'pause',
        onPress: () => downloads.pause(audio.id),
      });
    } else if (status === 'paused') {
      list.push({
        key: 'resume-download',
        label: t('audioActions.resumeDownload'),
        icon: 'play',
        onPress: () => downloads.resume(audio.id),
      });
    } else if (item.offline === 'available') {
      list.push({
        key: 'delete-download',
        label: t('audioActions.removeDownload'),
        icon: 'cloud-offline-outline',
        onPress: () => run.run(() => downloads.deleteDownloadedFile(audio.id)),
      });
    } else if (item.offline === 'failed') {
      list.push({
        key: 'retry-download',
        label: t('audioActions.retryDownload'),
        icon: 'refresh',
        onPress: () => downloads.retry(audio.id),
      });
    } else if (downloadable) {
      list.push({
        key: 'download',
        label: t('audioActions.download'),
        icon: 'arrow-down-circle-outline',
        onPress: () =>
          run.run(async () => {
            const result = await downloadCommands.downloadAudios([audio.id]);
            feedback.info(
              result.enqueued > 0
                ? t('audioActions.downloadQueued')
                : t('audioActions.cannotDownload'),
            );
          }),
      });
    }

    list.push(
      {
        key: 'add-playlist',
        label: t('audioActions.addToPlaylist'),
        icon: 'add-circle-outline',
        onPress: () => setPicker({ kind: 'playlist', audioId: audio.id }),
      },
      {
        key: 'add-collection',
        label: t('audioActions.addToCollection'),
        icon: 'albums-outline',
        onPress: () => setPicker({ kind: 'collection', audioId: audio.id }),
      },
    );
    list.push(
      item.progress?.completed
        ? {
            key: 'unplayed',
            label: t('audioActions.markUnplayed'),
            icon: 'refresh-circle-outline',
            onPress: () => run.run(() => progress.resetProgress(audio.id)),
          }
        : {
            key: 'completed',
            label: t('audioActions.markCompleted'),
            icon: 'checkmark-done-outline',
            onPress: () => run.run(() => progress.markCompleted(audio.id)),
          },
    );
    if (audio.sourceUrl) {
      const url = audio.sourceUrl;
      list.push({
        key: 'origin',
        label:
          audio.sourceType === 'youtube'
            ? t('audioActions.openYouTube')
            : t('audioActions.openSource'),
        icon: 'open-outline',
        onPress: () => Linking.openURL(url),
      });
    }
    if (context.collectionId) {
      const collectionId = context.collectionId;
      list.push({
        key: 'remove-collection',
        label: t('audioActions.removeFromCollection'),
        icon: 'remove-circle-outline',
        onPress: () => run.run(() => collections.removeAudio(collectionId, audio.id)),
      });
    }
    if (context.playlistId) {
      const playlistId = context.playlistId;
      list.push({
        key: 'remove-playlist',
        label: t('audioActions.removeFromPlaylist'),
        icon: 'remove-circle-outline',
        onPress: () => run.run(() => playlists.removeAudio(playlistId, audio.id)),
      });
    }
    if (context.fromPlayer) {
      list.push({
        key: 'close-player',
        label: t('audioActions.stopPlayback'),
        icon: 'stop-circle-outline',
        onPress: () => run.run(() => player.close()),
      });
    }
    list.push({
      key: 'delete',
      label: t('audioActions.deleteFromLibrary'),
      icon: 'trash-outline',
      destructive: true,
      onPress: () => setToDelete(item),
    });
    return list;
  }

  return (
    <>
      <AudioActionsMenu item={request?.item ?? null} actions={actions} onClose={close} />
      <TargetPickerSheet
        kind={picker?.kind ?? null}
        audioId={picker?.audioId ?? null}
        onClose={() => setPicker(null)}
      />
      <AppDialog
        visible={toDelete !== null}
        title={t('audioActions.deleteDialog.title')}
        message={t('audioActions.deleteDialog.message', {
          title: toDelete?.audio.title ?? '',
        })}
        onDismiss={() => setToDelete(null)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'destructive',
            testID: 'confirm-delete-audio',
            onPress: () => {
              if (toDelete) {
                deleteAudio.run(toDelete.audio.id);
              }
              setToDelete(null);
            },
          },
          { label: t('common.cancel'), onPress: () => setToDelete(null) },
        ]}
      />
    </>
  );
}
