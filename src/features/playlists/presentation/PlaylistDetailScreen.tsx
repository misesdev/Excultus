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
  useTranslation,
} from '@design-system';
import { formatHumanDuration, moveItem } from '@core/utils';
import type { AudioLibraryItem } from '@features/audios';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';

export function PlaylistDetailScreen() {
  const { t } = useTranslation();
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
    { successMessage: t('playlists.deleted') },
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
        <AppErrorState message={error ?? t('playlists.notFound')} onRetry={refetch} />
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
        title={order ? t('collections.menu.reorder') : data.playlist.name}
        subtitle={
          order
            ? undefined
            : `${t('common.audioCount', { count: items.length })} · ${formatHumanDuration(
                totalMs,
              )}`
        }
        onBack={order ? () => setOrder(null) : navigation.goBack}
        backIcon={order ? 'close' : 'arrow-back'}
        actions={
          order ? (
            <AppButton
              label={t('common.save')}
              size="sm"
              onPress={() => saveOrder.run()}
              loading={saveOrder.running}
            />
          ) : (
            <AppIconButton
              icon="ellipsis-horizontal"
              accessibilityLabel={t('common.moreOptions')}
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
          <AppButton
            label={t('audioActions.play')}
            icon="play"
            onPress={() => playAll.run()}
          />
        </View>
      )}
      <FlatList
        data={shown}
        keyExtractor={item => item.audio.id}
        contentContainerStyle={listStyles.grow}
        ListEmptyComponent={
          <AppEmptyState
            icon="musical-notes-outline"
            title={t('playlists.empty.title')}
            description={t('playlists.empty.description')}
            actionLabel={t('collections.empty.addFromLibrary')}
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
                    accessibilityLabel={t('playlists.moveUp')}
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
                    accessibilityLabel={t('playlists.moveDown')}
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
            label: t('common.edit'),
            icon: 'create-outline',
            onPress: () => navigation.navigate(Routes.PlaylistForm, { playlistId }),
          },
          {
            key: 'add',
            label: t('audioPicker.title'),
            icon: 'add-circle-outline',
            onPress: () =>
              navigation.navigate(Routes.AudioPicker, {
                target: { kind: 'playlist', id: playlistId, name: data.playlist.name },
              }),
          },
          {
            key: 'reorder',
            label: t('collections.menu.reorder'),
            icon: 'reorder-four-outline',
            disabled: items.length < 2,
            onPress: () => setOrder(ids),
          },
          {
            key: 'delete',
            label: t('playlists.deleteAction'),
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />
      <AppDialog
        visible={confirmDelete}
        title={t('playlists.deleteDialog.title')}
        message={t('playlists.deleteDialog.message')}
        onDismiss={() => setConfirmDelete(false)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmDelete(false);
              remove.run();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmDelete(false) },
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
