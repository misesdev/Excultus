import React, { useCallback } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import type { TranslationKey } from '@core/i18n';
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
  useTranslation,
} from '@design-system';
import type { AudioLibraryItem } from '@features/audios';
import { AudioCard, openAudioActions } from '@features/audios/presentation';
import { CollectionCard } from '@features/collections/presentation';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useQuery } from '@shared/hooks/useQuery';
import { ShortcutGrid, type Shortcut } from './components/ShortcutGrid';

const CONTINUE_LIMIT = 10;
const RECENT_LIMIT = 5;

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) {
    return 'home.greeting.morning';
  }
  return hour < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening';
}

/** Home prioritizes continuity: what you were listening to comes first. */
export function HomeScreen() {
  const { t } = useTranslation();
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
      label: t('home.shortcuts.favorites'),
      icon: 'heart',
      onPress: () =>
        navigation.navigate(Routes.Library, {
          filter: 'favorites',
          title: t('home.shortcuts.favorites'),
        }),
    },
    {
      key: 'playlists',
      label: t('home.shortcuts.playlists'),
      icon: 'list',
      onPress: () => navigation.navigate(Routes.Playlists),
    },
    {
      key: 'bookmarks',
      label: t('home.shortcuts.bookmarks'),
      icon: 'bookmarks',
      onPress: () => navigation.navigate(Routes.Bookmarks),
    },
    {
      key: 'history',
      label: t('home.shortcuts.history'),
      icon: 'time',
      onPress: () => navigation.navigate(Routes.History),
    },
    {
      key: 'offline',
      label: t('home.shortcuts.downloaded'),
      icon: 'arrow-down-circle',
      onPress: () =>
        navigation.navigate(Routes.Library, {
          filter: 'downloaded',
          title: t('home.shortcuts.downloaded'),
        }),
    },
    {
      key: 'all',
      label: t('home.shortcuts.allAudios'),
      icon: 'library',
      onPress: () => navigation.navigate(Routes.Library),
    },
  ];

  const header = (
    <AppHeader
      title={t(greetingKey(new Date().getHours()))}
      subtitle={t('home.subtitle')}
      variant="large"
      actions={
        <>
          <AppIconButton
            icon="search"
            accessibilityLabel={t('home.searchLibrary')}
            onPress={() => navigation.navigate(Routes.Library)}
            testID="home-search"
          />
          <AppIconButton
            icon="add"
            variant="tonal"
            accessibilityLabel={t('home.importContent')}
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
          title={t('home.empty.title')}
          description={t('home.empty.description')}
          actionLabel={t('home.importContent')}
          onAction={() => navigation.navigate(Routes.Import)}
          secondaryActionLabel={t('home.empty.createCollection')}
          onSecondaryAction={() => navigation.navigate(Routes.CollectionForm)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {(data?.continueListening.length ?? 0) > 0 && (
            <>
              <AppSectionHeader title={t('home.continueListening')} />
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

          <AppSectionHeader title={t('home.yourLibrary')} />
          <ShortcutGrid shortcuts={shortcuts} />

          {(data?.collections.length ?? 0) > 0 && (
            <>
              <AppSectionHeader
                title={t('home.collections')}
                actionLabel={t('home.seeAll')}
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
                title={t('home.recentlyAdded')}
                actionLabel={t('home.seeAll')}
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
