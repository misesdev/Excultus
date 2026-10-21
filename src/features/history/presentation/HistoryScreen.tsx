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
} from '@design-system';
import { formatClock, formatRelativeDate } from '@core/utils';
import type { AudioLibraryItem } from '@features/audios';
import { LibraryAudioRow, usePlayAudio } from '@features/library/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';
import { listStyles } from '@shared/styles/listStyles';

/** Playback log (most recent first) with shortcuts to in-progress/completed audios. */
export function HistoryScreen() {
  const styles = useStyles();
  const navigation = useAppNavigation();
  const { history } = useDependencies();
  const playAudio = usePlayAudio();
  const [confirmClear, setConfirmClear] = useState(false);
  const { items, loading, loadingMore, error, refetch, refreshing, loadMore } =
    usePaginatedQuery(page => history.recent(page), [], ['history', 'library']);
  const clear = useAsyncAction(() => history.clear(), {
    successMessage: 'Histórico limpo',
  });
  const play = useCallback((item: AudioLibraryItem) => playAudio(item), [playAudio]);

  return (
    <AppScreen>
      <AppHeader
        title="Histórico"
        onBack={navigation.goBack}
        actions={
          <AppIconButton
            icon="trash-outline"
            accessibilityLabel="Limpar histórico"
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
          label="Em andamento"
          icon="hourglass-outline"
          onPress={() =>
            navigation.navigate(Routes.Library, {
              filter: 'in-progress',
              title: 'Em andamento',
            })
          }
        />
        <AppChip
          label="Concluídos"
          icon="checkmark-done-outline"
          onPress={() =>
            navigation.navigate(Routes.Library, {
              filter: 'completed',
              title: 'Concluídos',
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
              title="Nada no histórico"
              description="Os áudios que você ouvir aparecerão aqui."
            />
          }
          renderItem={({ item: entry }) => (
            <View>
              <AppText variant="overline" color="textMuted" uppercase style={styles.when}>
                {formatRelativeDate(entry.entry.playedAt)}
                {entry.entry.positionMs > 0
                  ? ` · iniciado em ${formatClock(entry.entry.positionMs)}`
                  : ''}
              </AppText>
              <LibraryAudioRow item={entry.item} onPress={play} />
            </View>
          )}
        />
      )}
      <AppDialog
        visible={confirmClear}
        title="Limpar histórico?"
        message="O registro de reproduções será apagado. Suas posições salvas continuam, então “Continuar ouvindo” não é afetado."
        onDismiss={() => setConfirmClear(false)}
        actions={[
          {
            label: 'Limpar',
            variant: 'destructive',
            onPress: () => {
              setConfirmClear(false);
              clear.run();
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmClear(false) },
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
