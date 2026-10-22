import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListItem,
  AppListSkeleton,
  AppScreen,
  useTranslation,
} from '@design-system';
import { formatClock, formatRelativeDate } from '@core/utils';
import { AudioArtwork } from '@features/audios/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';
import type { BookmarkWithAudio } from '../index';
import { BookmarkFormSheet, type BookmarkFormValues } from './BookmarkFormSheet';

export function BookmarksScreen() {
  const { t } = useTranslation();
  const navigation = useAppNavigation();
  const { bookmarks, player } = useDependencies();
  const [editing, setEditing] = useState<BookmarkWithAudio | null>(null);
  const { data, loading, error, refetch, refreshing } = useQuery(
    () => bookmarks.listAll(),
    [],
    ['bookmarks'],
  );
  const edit = useAsyncAction(
    (id: string, values: BookmarkFormValues) => bookmarks.edit(id, values),
    { successMessage: t('bookmarks.updated') },
  );
  const open = useAsyncAction(async ({ bookmark, audio }: BookmarkWithAudio) => {
    await player.playQueue([audio.id], 0, { startPositionMs: bookmark.positionMs });
    navigation.navigate(Routes.Player);
  });

  return (
    <AppScreen>
      <AppHeader title={t('home.shortcuts.bookmarks')} onBack={navigation.goBack} />
      {loading && !data ? (
        <AppListSkeleton />
      ) : error && !data ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={entry => entry.bookmark.id}
          onRefresh={refetch}
          refreshing={refreshing}
          contentContainerStyle={listStyles.grow}
          ListEmptyComponent={
            <AppEmptyState
              icon="bookmarks-outline"
              title={t('bookmarks.emptyList.title')}
              description={t('bookmarks.emptyList.description')}
            />
          }
          renderItem={({ item: entry }) => (
            <AppListItem
              testID={`bookmark-${entry.bookmark.id}`}
              leading={<AudioArtwork audio={entry.audio} size="sm" />}
              title={
                entry.bookmark.title ??
                t('bookmarks.at', { position: formatClock(entry.bookmark.positionMs) })
              }
              subtitle={`${entry.audio.title} · ${formatClock(
                entry.bookmark.positionMs,
              )}`}
              caption={
                entry.bookmark.note ?? formatRelativeDate(entry.bookmark.createdAt)
              }
              onPress={() => open.run(entry)}
              onLongPress={() => setEditing(entry)}
              accessibilityHint={t('bookmarks.itemHint')}
              trailing={
                <AppIconButton
                  icon="trash-outline"
                  size="sm"
                  color="textSecondary"
                  accessibilityLabel={t('bookmarks.delete')}
                  onPress={() => bookmarks.remove(entry.bookmark.id)}
                />
              }
            />
          )}
        />
      )}
      <BookmarkFormSheet
        visible={editing !== null}
        positionMs={editing?.bookmark.positionMs ?? 0}
        initialValues={{ title: editing?.bookmark.title, note: editing?.bookmark.note }}
        submitting={edit.running}
        onClose={() => setEditing(null)}
        onSubmit={async values => {
          if (editing && (await edit.run(editing.bookmark.id, values))) {
            setEditing(null);
          }
        }}
      />
    </AppScreen>
  );
}
