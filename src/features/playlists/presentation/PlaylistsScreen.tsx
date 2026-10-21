import React from 'react';
import { FlatList } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppArtwork,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListItem,
  AppListSkeleton,
  AppScreen,
} from '@design-system';
import { formatHumanDuration, pluralize } from '@core/utils';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';

export function PlaylistsScreen() {
  const navigation = useAppNavigation();
  const { playlists } = useDependencies();
  const { data, loading, error, refetch, refreshing } = useQuery(
    () => playlists.list(),
    [],
    ['playlists', 'library'],
  );

  return (
    <AppScreen>
      <AppHeader
        title="Playlists"
        onBack={navigation.goBack}
        actions={
          <AppIconButton
            icon="add"
            variant="tonal"
            accessibilityLabel="Criar playlist"
            onPress={() => navigation.navigate(Routes.PlaylistForm)}
            testID="create-playlist"
          />
        }
      />
      {loading && !data ? (
        <AppListSkeleton />
      ) : error && !data ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={summary => summary.playlist.id}
          contentContainerStyle={listStyles.grow}
          refreshing={refreshing}
          onRefresh={refetch}
          ListEmptyComponent={
            <AppEmptyState
              icon="list-outline"
              title="Nenhuma playlist"
              description="Playlists são sequências de reprodução que você monta com áudios de qualquer coleção."
              actionLabel="Criar playlist"
              onAction={() => navigation.navigate(Routes.PlaylistForm)}
            />
          }
          renderItem={({ item: summary }) => (
            <AppListItem
              testID={`playlist-${summary.playlist.id}`}
              leading={
                <AppArtwork seed={summary.playlist.id} size="sm" placeholderIcon="list" />
              }
              title={summary.playlist.name}
              subtitle={[
                pluralize(summary.audioCount, 'áudio', 'áudios'),
                summary.totalDurationMs > 0
                  ? formatHumanDuration(summary.totalDurationMs)
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              caption={summary.playlist.description}
              showChevron
              onPress={() =>
                navigation.navigate(Routes.PlaylistDetail, {
                  playlistId: summary.playlist.id,
                })
              }
            />
          )}
        />
      )}
    </AppScreen>
  );
}
