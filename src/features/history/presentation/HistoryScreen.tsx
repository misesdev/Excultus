import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppChip,
  AppDialog,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppLoadingIndicator,
  AppScreen,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { formatClock, formatRelativeDate } from '@core/utils';
import type { AudioLibraryItem } from '@features/audios';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';
import { listStyles } from '@shared/styles/listStyles';

/** Playback log (most recent first) with shortcuts to in-progress/completed audios. */
export function HistoryScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigation = useAppNavigation();
  const { history } = useDependencies();
  const playAudio = usePlayAudio();
  const [confirmClear, setConfirmClear] = useState(false);
  const { items, loading, loadingMore, error, refetch, refreshing, loadMore } =
    usePaginatedQuery(page => history.recent(page), [], ['history', 'library']);
  const clear = useAsyncAction(() => history.clear(), {
    successMessage: t('history.cleared'),
  });
  const play = useCallback((item: AudioLibraryItem) => playAudio(item), [playAudio]);

  return (
    <AppScreen>
      <AppHeader
        title={t('home.shortcuts.history')}
        onBack={navigation.goBack}
        actions={
          <AppIconButton
            icon="trash-outline"
            accessibilityLabel={t('history.clear')}
            disabled={items.length === 0}
            onPress={() => setConfirmClear(true)}
          />
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcuts}
      >
        <AppChip
          label={t('library.filters.inProgress')}
          icon="hourglass-outline"
          onPress={() =>
            navigation.navigate(Routes.Library, {
              filter: 'in-progress',
              title: t('library.filters.inProgress'),
            })
          }
        />
        <AppChip
          label={t('library.filters.completed')}
          icon="checkmark-done-outline"
          onPress={() =>
            navigation.navigate(Routes.Library, {
              filter: 'completed',
              title: t('library.filters.completed'),
            })
          }
        />
      </ScrollView>
      {loading ? (
        <AppListSkeleton />
      ) : error && items.length === 0 ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={entry => String(entry.entry.id)}
          contentContainerStyle={listStyles.grow}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onRefresh={refetch}
          refreshing={refreshing}
          ListFooterComponent={
            loadingMore ? <AppLoadingIndicator size="small" /> : undefined
          }
          ListEmptyComponent={
            <AppEmptyState
              icon="time-outline"
              title={t('history.empty.title')}
              description={t('history.empty.description')}
            />
          }
          renderItem={({ item: entry }) => (
            <View>
              <AppText variant="overline" color="textMuted" uppercase style={styles.when}>
                {formatRelativeDate(entry.entry.playedAt)}
                {entry.entry.positionMs > 0
                  ? ` · ${t('history.startedAt', {
                      position: formatClock(entry.entry.positionMs),
                    })}`
                  : ''}
              </AppText>
              <LibraryAudioRow item={entry.item} onPress={play} />
            </View>
          )}
        />
      )}
      <AppDialog
        visible={confirmClear}
        title={t('history.clearDialog.title')}
        message={t('history.clearDialog.message')}
        onDismiss={() => setConfirmClear(false)}
        actions={[
          {
            label: t('history.clearDialog.confirm'),
            variant: 'destructive',
            onPress: () => {
              setConfirmClear(false);
              clear.run();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmClear(false) },
        ]}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  shortcuts: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  when: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
}));
