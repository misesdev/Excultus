import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppButton,
  AppContextMenu,
  AppDialog,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppScreen,
  AppText,
  makeStyles,
} from '@design-system';
import { formatHumanDuration, moveItem, pluralize } from '@core/utils';
import type { AudioLibraryItem } from '@features/audios';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';

export function PlaylistDetailScreen() {
  const styles = useStyles();
  const navigation = useAppNavigation();
  const { playlistId } = useAppRoute<typeof Routes.PlaylistDetail>().params;
  const { playlists, player } = useDependencies();
  const playAudio = usePlayAudio();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const { data, loading, error, refetch } = useQuery(
    () => playlists.getDetail(playlistId),
    [playlistId],
    ['playlists', 'library', 'downloads', 'history'],
  );
  const items = data?.items ?? [];
  const ids = items.map(item => item.audio.id);
  const name = data?.playlist.name ?? '';
  const queueRef = useRef({ ids, name });
  queueRef.current = { ids, name };

  const play = useCallback(
    (item: AudioLibraryItem) =>
      playAudio(item, { queueIds: queueRef.current.ids, label: queueRef.current.name }),
    [playAudio],
  );
  const playAll = useAsyncAction(() => player.playQueue(ids, 0, { contextLabel: name }));
  const saveOrder = useAsyncAction(async () => {
    if (order) {
      await playlists.reorder(playlistId, order);
    }
    setOrder(null);
  });
  const remove = useAsyncAction(
    async () => {
      await playlists.delete(playlistId);
      navigation.goBack();
    },
    { successMessage: 'Playlist excluída' },
  );

  if (loading && !data) {
    return (
      <AppScreen>
        <AppHeader onBack={navigation.goBack} />
        <AppListSkeleton />
      </AppScreen>
    );
  }
  if (!data) {
    return (
      <AppScreen>
        <AppHeader onBack={navigation.goBack} />
        <AppErrorState message={error ?? 'Playlist não encontrada.'} onRetry={refetch} />
      </AppScreen>
    );
  }

  const shown = order
    ? order
        .map(id => items.find(item => item.audio.id === id))
        .filter((item): item is AudioLibraryItem => !!item)
    : items;
  const totalMs = items.reduce((sum, item) => sum + (item.audio.durationMs ?? 0), 0);

  return (
    <AppScreen>
      <AppHeader
        title={order ? 'Reordenar' : data.playlist.name}
        subtitle={
          order
            ? undefined
            : `${pluralize(items.length, 'áudio', 'áudios')} · ${formatHumanDuration(
                totalMs,
              )}`
        }
        onBack={order ? () => setOrder(null) : navigation.goBack}
        backIcon={order ? 'close' : 'arrow-back'}
        actions={
          order ? (
            <AppButton
              label="Salvar"
              size="sm"
              onPress={() => saveOrder.run()}
              loading={saveOrder.running}
            />
          ) : (
            <AppIconButton
              icon="ellipsis-horizontal"
              accessibilityLabel="Mais opções"
              onPress={() => setMenuOpen(true)}
            />
          )
        }
      />
      {!order && data.playlist.description && (
        <AppText variant="caption" color="textSecondary" style={styles.description}>
          {data.playlist.description}
        </AppText>
      )}
      {!order && items.length > 0 && (
        <View style={styles.actions}>
          <AppButton label="Reproduzir" icon="play" onPress={() => playAll.run()} />
        </View>
      )}
      <FlatList
        data={shown}
        keyExtractor={item => item.audio.id}
        contentContainerStyle={listStyles.grow}
        ListEmptyComponent={
          <AppEmptyState
            icon="musical-notes-outline"
            title="Playlist vazia"
            description="Adicione áudios pelo menu de qualquer áudio ou escolha da biblioteca."
            actionLabel="Adicionar da biblioteca"
            onAction={() =>
              navigation.navigate(Routes.AudioPicker, {
                target: { kind: 'playlist', id: playlistId, name: data.playlist.name },
              })
            }
          />
        }
        renderItem={({ item, index }) => (
          <LibraryAudioRow
            item={item}
            onPress={play}
            hideActions={order !== null}
            actionContext={{ playlistId, queueIds: ids, queueLabel: data.playlist.name }}
            trailing={
              order ? (
                <View style={styles.reorder}>
                  <AppIconButton
                    icon="chevron-up"
                    size="sm"
                    accessibilityLabel="Mover para cima"
                    disabled={index === 0}
                    onPress={() =>
                      setOrder(previous =>
                        previous ? moveItem(previous, index, index - 1) : previous,
                      )
                    }
                  />
                  <AppIconButton
                    icon="chevron-down"
                    size="sm"
                    accessibilityLabel="Mover para baixo"
                    disabled={index === shown.length - 1}
                    onPress={() =>
                      setOrder(previous =>
                        previous ? moveItem(previous, index, index + 1) : previous,
                      )
                    }
                  />
                </View>
              ) : undefined
            }
          />
        )}
      />
      <AppContextMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={data.playlist.name}
        actions={[
          {
            key: 'edit',
            label: 'Editar',
            icon: 'create-outline',
            onPress: () => navigation.navigate(Routes.PlaylistForm, { playlistId }),
          },
          {
            key: 'add',
            label: 'Adicionar áudios',
            icon: 'add-circle-outline',
            onPress: () =>
              navigation.navigate(Routes.AudioPicker, {
                target: { kind: 'playlist', id: playlistId, name: data.playlist.name },
              }),
          },
          {
            key: 'reorder',
            label: 'Reordenar',
            icon: 'reorder-four-outline',
            disabled: items.length < 2,
            onPress: () => setOrder(ids),
          },
          {
            key: 'delete',
            label: 'Excluir playlist',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />
      <AppDialog
        visible={confirmDelete}
        title="Excluir playlist?"
        message="Os áudios continuam na biblioteca e nas coleções."
        onDismiss={() => setConfirmDelete(false)}
        actions={[
          {
            label: 'Excluir',
            variant: 'destructive',
            onPress: () => {
              setConfirmDelete(false);
              remove.run();
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmDelete(false) },
        ]}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  description: { paddingHorizontal: theme.spacing.lg },
  actions: { flexDirection: 'row', padding: theme.spacing.lg },
  reorder: { flexDirection: 'row' },
}));
