import React from 'react';
import { View } from 'react-native';
import {
  AppArtwork,
  AppButton,
  AppIconButton,
  AppProgressBar,
  AppText,
  makeStyles,
  useTheme,
} from '@design-system';
import { formatHumanDuration, formatPercent, pluralize } from '@core/utils';
import { collectionProgress, type CollectionSummary } from '../../index';

export interface CollectionHeaderProps {
  summary: CollectionSummary;
  onPlay: () => void;
  onShuffle: () => void;
  onDownloadAll: () => void;
  onMore: () => void;
  downloading?: boolean;
}

/** Cover, description and statistics of a collection, plus primary actions. */
export function CollectionHeader({
  summary,
  onPlay,
  onShuffle,
  onDownloadAll,
  onMore,
  downloading,
}: CollectionHeaderProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { collection, audioCount, totalDurationMs, offlineCount } = summary;
  const progress = collectionProgress(summary);
  const empty = audioCount === 0;

  return (
    <View style={styles.root}>
      <View style={styles.cover}>
        <AppArtwork
          source={collection.artworkPath}
          seed={collection.id}
          size={theme.sizes.artwork.xl}
          radius="lg"
          placeholderIcon="albums"
        />
      </View>
      <AppText variant="title" align="center" accessibilityRole="header">
        {collection.name}
      </AppText>
      {collection.description && (
        <AppText variant="body" color="textSecondary" align="center" numberOfLines={4}>
          {collection.description}
        </AppText>
      )}
      <AppText
        variant="caption"
        color="textMuted"
        align="center"
        testID="collection-stats"
      >
        {[
          pluralize(audioCount, 'áudio', 'áudios'),
          totalDurationMs > 0 ? formatHumanDuration(totalDurationMs) : null,
          `${offlineCount} offline`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      {progress > 0 && (
        <View style={styles.progress}>
          <AppProgressBar progress={progress} accessibilityLabel="Progresso geral" />
          <AppText variant="caption" color="textSecondary">
            {formatPercent(progress)} ouvido
          </AppText>
        </View>
      )}
      <View style={styles.actions}>
        <AppIconButton
          icon="arrow-down-circle-outline"
          variant="tonal"
          accessibilityLabel="Baixar todos"
          onPress={onDownloadAll}
          disabled={empty || offlineCount === audioCount}
          loading={downloading}
          testID="collection-download-all"
        />
        <AppIconButton
          icon="shuffle"
          variant="tonal"
          accessibilityLabel="Reproduzir em ordem aleatória"
          onPress={onShuffle}
          disabled={empty}
        />
        <AppButton
          label="Reproduzir"
          icon="play"
          onPress={onPlay}
          disabled={empty}
          testID="collection-play"
        />
        <AppIconButton
          icon="ellipsis-horizontal"
          variant="tonal"
          accessibilityLabel="Mais opções da coleção"
          onPress={onMore}
          testID="collection-more"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { padding: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center' },
  cover: { paddingBottom: theme.spacing.sm, ...theme.shadows.medium },
  progress: { alignSelf: 'stretch', gap: theme.spacing.xs, alignItems: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
}));
