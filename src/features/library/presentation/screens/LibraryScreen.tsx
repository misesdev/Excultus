import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppLoadingIndicator,
  AppScreen,
  AppSearchInput,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import type { AudioLibraryItem } from '@features/audios';
import type { LibraryFilter, LibrarySort } from '@features/search';
import { OptionSheet } from '@shared/components/OptionSheet';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';
import { listStyles } from '@shared/styles/listStyles';
import { LibraryAudioRow } from '../components/LibraryAudioRow';
import {
  filterLabel,
  LibraryFilters,
  sortLabel,
  sortOptions,
} from '../components/LibraryFilters';
import { usePlayAudio } from '../hooks/usePlayAudio';

/** Whole-library search with filters, sorting and incremental loading. */
export function LibraryScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigation = useAppNavigation();
  const route = useAppRoute<typeof Routes.Library>();
  const { search } = useDependencies();
  const playAudio = usePlayAudio();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>(route.params?.filter ?? 'all');
  const [sort, setSort] = useState<LibrarySort>('addedAt');
  const [sortSheet, setSortSheet] = useState(false);
  const query = useDebouncedValue(text);

  const { items, loading, loadingMore, error, refetch, refreshing, loadMore } =
    usePaginatedQuery(
      page => search.search({ text: query, filter, sort }, page),
      [query, filter, sort],
      ['library', 'collections', 'downloads', 'history'],
    );

  const ids = items.map(item => item.audio.id);
  const title = route.params?.title ?? t('library.title');
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const onPress = useCallback(
    (item: AudioLibraryItem) =>
      playAudio(item, { queueIds: idsRef.current, label: title }),
    [playAudio, title],
  );

  return (
    <AppScreen testID="library-screen">
      <AppHeader
        title={title}
        onBack={navigation.goBack}
        actions={
          <AppIconButton
            icon="swap-vertical"
            accessibilityLabel={t('library.sortBy', { sort: sortLabel(sort) })}
            onPress={() => setSortSheet(true)}
          />
        }
      />
      <View style={styles.search}>
        <AppSearchInput
          value={text}
          onChangeText={setText}
          placeholder={t('library.searchPlaceholder')}
          testID="library-search"
        />
      </View>
      <LibraryFilters value={filter} onChange={setFilter} />
      <AppText variant="caption" color="textMuted" style={styles.sortLabel}>
        {t('library.sortedBy', { sort: sortLabel(sort).toLowerCase() })}
      </AppText>
      {loading ? (
        <AppListSkeleton />
      ) : error && items.length === 0 ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.audio.id}
          renderItem={({ item }) => (
            <LibraryAudioRow
              item={item}
              onPress={onPress}
              actionContext={{ queueIds: ids, queueLabel: title }}
              testID={`audio-${item.audio.id}`}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onRefresh={refetch}
          refreshing={refreshing}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={listStyles.grow}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={
            loadingMore ? <AppLoadingIndicator size="small" /> : undefined
          }
          ListEmptyComponent={
            query || filter !== 'all' ? (
              <AppEmptyState
                icon="search-outline"
                title={t('library.noResults')}
                description={
                  query
                    ? t('library.noResultsFor', {
                        query,
                        filter: filterLabel(filter).toLowerCase(),
                      })
                    : t('library.noAudiosIn', {
                        filter: filterLabel(filter).toLowerCase(),
                      })
                }
              />
            ) : (
              <AppEmptyState
                icon="library-outline"
                title={t('library.empty.title')}
                description={t('library.empty.description')}
                actionLabel={t('home.importContent')}
                onAction={() => navigation.navigate(Routes.Import)}
              />
            )
          }
        />
      )}
      <OptionSheet
        visible={sortSheet}
        title={t('library.sortTitle')}
        options={sortOptions()}
        selected={sort}
        onSelect={setSort}
        onClose={() => setSortSheet(false)}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  search: { paddingHorizontal: theme.spacing.lg },
  sortLabel: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xs },
}));
