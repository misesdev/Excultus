import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppDialog, type AppMenuAction } from '@design-system';
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
      successMessage: 'Áudio removido da biblioteca',
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
        label: 'Reproduzir',
        icon: 'play',
        onPress: () =>
          playAudio(item, { queueIds: context.queueIds, label: context.queueLabel }),
      });
    }
    if (queueable) {
      list.push(
        {
          key: 'play-next',
          label: 'Tocar em seguida',
          icon: 'return-down-forward',
          onPress: () =>
            run
              .run(() => player.playNext([audio.id]))
              .then(() => feedback.info('Vai tocar em seguida')),
        },
        {
          key: 'queue',
          label: 'Adicionar à fila',
          icon: 'list',
          onPress: () =>
            run
              .run(() => player.addToQueue([audio.id]))
              .then(() => feedback.info('Adicionado à fila')),
        },
      );
    }
    list.push({
      key: 'favorite',
      label: item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      icon: item.isFavorite ? 'heart-dislike-outline' : 'heart-outline',
      onPress: () => run.run(() => audios.toggleFavorite(audio.id)),
    });

    if (status === 'downloading' || status === 'queued') {
      list.push({
        key: 'pause-download',
        label: 'Pausar download',
        icon: 'pause',
        onPress: () => downloads.pause(audio.id),
      });
    } else if (status === 'paused') {
      list.push({
        key: 'resume-download',
        label: 'Retomar download',
        icon: 'play',
        onPress: () => downloads.resume(audio.id),
      });
    } else if (item.offline === 'available') {
      list.push({
        key: 'delete-download',
        label: 'Remover download',
        icon: 'cloud-offline-outline',
        onPress: () => run.run(() => downloads.deleteDownloadedFile(audio.id)),
      });
    } else if (item.offline === 'failed') {
      list.push({
        key: 'retry-download',
        label: 'Tentar baixar de novo',
        icon: 'refresh',
        onPress: () => downloads.retry(audio.id),
      });
    } else if (downloadable) {
      list.push({
        key: 'download',
        label: 'Baixar para ouvir offline',
        icon: 'arrow-down-circle-outline',
        onPress: () =>
          run.run(async () => {
            const result = await downloadCommands.downloadAudios([audio.id]);
            feedback.info(
              result.enqueued > 0
                ? 'Download adicionado à fila'
                : 'Este áudio não pode ser baixado',
            );
          }),
      });
    }

    list.push(
      {
        key: 'add-playlist',
        label: 'Adicionar à playlist',
        icon: 'add-circle-outline',
        onPress: () => setPicker({ kind: 'playlist', audioId: audio.id }),
      },
      {
        key: 'add-collection',
        label: 'Adicionar à coleção',
        icon: 'albums-outline',
        onPress: () => setPicker({ kind: 'collection', audioId: audio.id }),
      },
    );
    list.push(
      item.progress?.completed
        ? {
            key: 'unplayed',
            label: 'Marcar como não ouvido',
            icon: 'refresh-circle-outline',
            onPress: () => run.run(() => progress.resetProgress(audio.id)),
          }
        : {
            key: 'completed',
            label: 'Marcar como concluído',
            icon: 'checkmark-done-outline',
            onPress: () => run.run(() => progress.markCompleted(audio.id)),
          },
    );
    if (audio.sourceUrl) {
      const url = audio.sourceUrl;
      list.push({
        key: 'origin',
        label:
          audio.sourceType === 'youtube' ? 'Abrir no YouTube' : 'Abrir página de origem',
        icon: 'open-outline',
        onPress: () => Linking.openURL(url),
      });
    }
    if (context.collectionId) {
      const collectionId = context.collectionId;
      list.push({
        key: 'remove-collection',
        label: 'Remover desta coleção',
        icon: 'remove-circle-outline',
        onPress: () => run.run(() => collections.removeAudio(collectionId, audio.id)),
      });
    }
    if (context.playlistId) {
      const playlistId = context.playlistId;
      list.push({
        key: 'remove-playlist',
        label: 'Remover desta playlist',
        icon: 'remove-circle-outline',
        onPress: () => run.run(() => playlists.removeAudio(playlistId, audio.id)),
      });
    }
    if (context.fromPlayer) {
      list.push({
        key: 'close-player',
        label: 'Encerrar reprodução',
        icon: 'stop-circle-outline',
        onPress: () => run.run(() => player.close()),
      });
    }
    list.push({
      key: 'delete',
      label: 'Excluir da biblioteca',
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
        title="Excluir da biblioteca?"
        message={`"${
          toDelete?.audio.title ?? ''
        }" será removido de todas as coleções e playlists, junto com o arquivo baixado, o progresso e os marcadores.`}
        onDismiss={() => setToDelete(null)}
        actions={[
          {
            label: 'Excluir',
            variant: 'destructive',
            testID: 'confirm-delete-audio',
            onPress: () => {
              if (toDelete) {
                deleteAudio.run(toDelete.audio.id);
              }
              setToDelete(null);
            },
          },
          { label: 'Cancelar', onPress: () => setToDelete(null) },
        ]}
      />
    </>
  );
}
