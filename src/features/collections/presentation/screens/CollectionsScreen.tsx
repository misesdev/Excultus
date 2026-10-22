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
  useTranslation,
} from '@design-system';
import { useQuery } from '@shared/hooks/useQuery';
import { CollectionGrid } from '../components/CollectionGrid';

export function CollectionsScreen() {
  const { t } = useTranslation();
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
        title={t('tabs.collections')}
        variant="large"
        actions={
          <>
            <AppIconButton
              icon="cloud-download-outline"
              accessibilityLabel={t('home.importContent')}
              onPress={() => navigation.navigate(Routes.Import)}
            />
            <AppIconButton
              icon="add"
              variant="tonal"
              accessibilityLabel={t('home.empty.createCollection')}
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
              title={t('collections.emptyList.title')}
              description={t('collections.emptyList.description')}
              actionLabel={t('home.empty.createCollection')}
              onAction={() => navigation.navigate(Routes.CollectionForm)}
              secondaryActionLabel={t('home.importContent')}
              onSecondaryAction={() => navigation.navigate(Routes.Import)}
            />
          }
        />
      )}
    </AppScreen>
  );
}
