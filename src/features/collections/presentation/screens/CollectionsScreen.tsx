import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppScreen,
} from '@design-system';
import { useQuery } from '@shared/hooks/useQuery';
import { CollectionGrid } from '../components/CollectionGrid';

export function CollectionsScreen() {
  const navigation = useAppNavigation();
  const { collections } = useDependencies();
  const { data, loading, error, refetch, refreshing } = useQuery(
    () => collections.list(),
    [],
    ['collections', 'library', 'downloads'],
  );

  return (
    <AppScreen testID="collections-screen">
      <AppHeader
        title="Coleções"
        variant="large"
        actions={
          <>
            <AppIconButton
              icon="cloud-download-outline"
              accessibilityLabel="Importar conteúdo"
              onPress={() => navigation.navigate(Routes.Import)}
            />
            <AppIconButton
              icon="add"
              variant="tonal"
              accessibilityLabel="Criar coleção"
              onPress={() => navigation.navigate(Routes.CollectionForm)}
              testID="create-collection"
            />
          </>
        }
      />
      {loading && !data ? (
        <AppListSkeleton />
      ) : error && !data ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <CollectionGrid
          summaries={data ?? []}
          onOpen={collectionId =>
            navigation.navigate(Routes.CollectionDetail, { collectionId })
          }
          refreshing={refreshing}
          onRefresh={refetch}
          empty={
            <AppEmptyState
              icon="albums-outline"
              title="Organize seus áudios"
              description="Coleções agrupam cursos, audiolivros, podcasts e músicas. Um áudio pode estar em várias coleções."
              actionLabel="Criar coleção"
              onAction={() => navigation.navigate(Routes.CollectionForm)}
              secondaryActionLabel="Importar do Internet Archive"
              onSecondaryAction={() => navigation.navigate(Routes.Import)}
            />
          }
        />
      )}
    </AppScreen>
  );
}
