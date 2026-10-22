import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  AppArtwork,
  AppIcon,
  AppProgressBar,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { formatHumanDuration } from '@core/utils';
import { collectionProgress, type CollectionSummary } from '../../index';

export interface CollectionCardProps {
  summary: CollectionSummary;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
}

function CollectionCardComponent({
  summary,
  width,
  onPress,
  onLongPress,
}: CollectionCardProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { collection, audioCount, totalDurationMs, offlineCount } = summary;
  const progress = collectionProgress(summary);
  const meta = [
    t('common.audioCount', { count: audioCount }),
    totalDurationMs > 0 ? formatHumanDuration(totalDurationMs) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      testID={`collection-${collection.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${meta}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.root, { width }, pressed && styles.pressed]}
    >
      <AppArtwork
        source={collection.artworkPath}
        seed={collection.id}
        size={width}
        radius="lg"
        placeholderIcon="albums"
      />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {collection.name}
        </AppText>
        <View style={styles.metaRow}>
          {offlineCount > 0 && (
            <AppIcon name="arrow-down-circle" size="xs" color="success" />
          )}
          <AppText
            variant="caption"
            color="textSecondary"
            numberOfLines={1}
            style={styles.meta}
          >
            {meta}
          </AppText>
        </View>
        {progress > 0 && (
          <AppProgressBar
            progress={progress}
            height={3}
            accessibilityLabel={t('collections.progress')}
          />
        )}
      </View>
    </Pressable>
  );
}

export const CollectionCard = memo(CollectionCardComponent);

const useStyles = makeStyles(theme => ({
  root: { gap: theme.spacing.sm },
  pressed: { opacity: theme.opacity.pressed },
  texts: { gap: theme.spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  meta: { flex: 1 },
}));
