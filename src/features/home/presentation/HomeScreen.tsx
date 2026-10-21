import React, { useCallback } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppScreen,
  AppSectionHeader,
  AppSkeleton,
  makeStyles,
  useTheme,
} from '@design-system';
import type { AudioLibraryItem } from '@features/audios';
import { AudioCard, openAudioActions } from '@features/audios/presentation';
import { CollectionCard } from '@features/collections/presentation';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useQuery } from '@shared/hooks/useQuery';
import { ShortcutGrid, type Shortcut } from './components/ShortcutGrid';

const CONTINUE_LIMIT = 10;
const RECENT_LIMIT = 5;

function greeting(hour: number): string {
  if (hour < 12) {
    return 'Bom dia';
  }
  return hour < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Home prioritizes continuity: what you were listening to comes first. */
export function HomeScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useAppNavigation();
  const { history, search, collections } = useDependencies();
  const playAudio = usePlayAudio();
  const { data, loading, error, refetch } = useQuery(
    async () => {
      const [continueListening, recent, collectionList] = await Promise.all([
        history.continueListening(CONTINUE_LIMIT),
        search.recentlyAdded(RECENT_LIMIT),
        collections.list(),
      ]);
      return { continueListening, recent, collections: collectionList };
    },
    [],
    ['library', 'history', 'collections', 'downloads'],
  );
  const play = useCallback((item: AudioLibraryItem) => playAudio(item), [playAudio]);

  const shortcuts: Shortcut[] = [
    {
      key: 'favorites',
      label: 'Favoritos',
      icon: 'heart',
      onPress: () =>
        navigation.navigate(Routes.Library, { filter: 'favorites', title: 'Favoritos' }),
    },
    {
      key: 'playlists',
      label: 'Playlists',
      icon: 'list',
      onPress: () => navigation.navigate(Routes.Playlists),
    },
    {
      key: 'bookmarks',
      label: 'Marcadores',
      icon: 'bookmarks',
      onPress: () => navigation.navigate(Routes.Bookmarks),
    },
    {
      key: 'history',
      label: 'Histórico',
      icon: 'time',
      onPress: () => navigation.navigate(Routes.History),
    },
    {
      key: 'offline',
      label: 'Baixados',
      icon: 'arrow-down-circle',
      onPress: () =>
        navigation.navigate(Routes.Library, { filter: 'downloaded', title: 'Baixados' }),
    },
    {
      key: 'all',
      label: 'Todos os áudios',
      icon: 'library',
      onPress: () => navigation.navigate(Routes.Library),
    },
  ];

  const header = (
    <AppHeader
      title={greeting(new Date().getHours())}
      subtitle="Sua biblioteca de áudio"
      variant="large"
      actions={
        <>
          <AppIconButton
            icon="search"
            accessibilityLabel="Buscar na biblioteca"
            onPress={() => navigation.navigate(Routes.Library)}
            testID="home-search"
          />
          <AppIconButton
            icon="add"
            variant="tonal"
            accessibilityLabel="Importar conteúdo"
            onPress={() => navigation.navigate(Routes.Import)}
            testID="home-import"
          />
        </>
      }
    />
  );

  if (loading && !data) {
    return (
      <AppScreen>
        {header}
        <View style={styles.skeletonShelf}>
          {[0, 1, 2].map(index => (
            <AppSkeleton
              key={index}
              width={theme.sizes.artwork.xl}
              height={theme.sizes.artwork.xl}
              radius="lg"
            />
          ))}
        </View>
        <AppListSkeleton rows={4} />
      </AppScreen>
    );
  }
  if (error && !data) {
    return (
      <AppScreen>
        {header}
        <AppErrorState message={error} onRetry={refetch} />
      </AppScreen>
    );
  }

  const isEmpty =
    (data?.recent.length ?? 0) === 0 && (data?.collections.length ?? 0) === 0;

  return (
    <AppScreen testID="home-screen">
      {header}
      {isEmpty ? (
        <AppEmptyState
          icon="headset-outline"
          title="Comece sua biblioteca"
          description="Importe cursos, audiolivros e podcasts do Internet Archive, de links diretos ou do seu dispositivo, e ouça offline."
          actionLabel="Importar conteúdo"
          onAction={() => navigation.navigate(Routes.Import)}
          secondaryActionLabel="Criar coleção"
          onSecondaryAction={() => navigation.navigate(Routes.CollectionForm)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {(data?.continueListening.length ?? 0) > 0 && (
            <>
              <AppSectionHeader title="Continuar ouvindo" />
              <FlatList
                horizontal
                data={data?.continueListening}
                keyExtractor={item => item.audio.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shelf}
                renderItem={({ item }) => (
                  <AudioCard
                    item={item}
                    onPress={() => play(item)}
                    onLongPress={() => openAudioActions(item)}
                    testID={`continue-${item.audio.id}`}
                  />
                )}
              />
            </>
          )}

          <AppSectionHeader title="Sua biblioteca" />
          <ShortcutGrid shortcuts={shortcuts} />

          {(data?.collections.length ?? 0) > 0 && (
            <>
              <AppSectionHeader
                title="Coleções"
                actionLabel="Ver todas"
                onAction={() =>
                  navigation.navigate(Routes.MainTabs, { screen: Routes.CollectionsTab })
                }
              />
              <FlatList
                horizontal
                data={data?.collections}
                keyExtractor={summary => summary.collection.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shelf}
                renderItem={({ item }) => (
                  <CollectionCard
                    summary={item}
                    width={theme.sizes.artwork.lg}
                    onPress={() =>
                      navigation.navigate(Routes.CollectionDetail, {
                        collectionId: item.collection.id,
                      })
                    }
                  />
                )}
              />
            </>
          )}

          {(data?.recent.length ?? 0) > 0 && (
            <>
              <AppSectionHeader
                title="Adicionados recentemente"
                actionLabel="Ver tudo"
                onAction={() => navigation.navigate(Routes.Library)}
              />
              {data?.recent.map(item => (
                <LibraryAudioRow key={item.audio.id} item={item} onPress={play} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  content: { paddingBottom: theme.spacing.xl },
  shelf: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  skeletonShelf: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
}));
