import React, { useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppBottomSheet,
  AppIconButton,
  AppListSkeleton,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import type { AudioLibraryItem } from '@features/audios';
import { AudioListItem } from '@features/audios/presentation';
import { useQuery } from '@shared/hooks/useQuery';
import { orderedIds } from '../../index';
import { usePlayerStore } from '../store/playerStore';

/** The temporary, active play order (distinct from collections and playlists). */
export function PlaybackQueue({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { player, audios } = useDependencies();
  const queue = usePlayerStore(state => state.queue);
  const status = usePlayerStore(state => state.status);
  const ids = orderedIds(queue);
  const idsKey = ids.join(',');
  const { data, loading } = useQuery(() => audios.getItems(ids), [idsKey], ['library']);

  const renderItem = useCallback(
    ({ item, index }: { item: AudioLibraryItem; index: number }) => {
      const isCurrent = index === queue.position;
      return (
        <AudioListItem
          item={item}
          nowPlaying={isCurrent ? (status === 'playing' ? 'playing' : 'paused') : null}
          onPress={() => player.skipToQueuePosition(index)}
          trailing={
            isCurrent ? null : (
              <AppIconButton
                icon="remove-circle-outline"
                size="sm"
                color="textSecondary"
                accessibilityLabel={t('player.removeFromQueue', {
                  title: item.audio.title,
                })}
                onPress={() => player.removeFromQueue(item.audio.id)}
              />
            )
          }
        />
      );
    },
    [player, queue.position, status, t],
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('player.queue')}
      testID="queue-sheet"
    >
      <View style={styles.summary}>
        <AppText variant="caption" color="textSecondary">
          {queue.shuffled ? `${t('player.shuffled')} · ` : ''}
          {t('player.itemCount', { count: ids.length })}
        </AppText>
      </View>
      {loading && !data ? (
        <AppListSkeleton rows={4} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => item.audio.id}
          renderItem={renderItem}
        />
      )}
    </AppBottomSheet>
  );
}

const useStyles = makeStyles(theme => ({
  summary: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
}));
