import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  AppIcon,
  AppIconButton,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import type { AudioLibraryItem } from '../../domain/entities/AudioLibraryItem';
import { AudioArtwork } from './AudioArtwork';
import { audioDurationLabel } from './AudioDuration';
import { audioSubtitle } from './AudioMetadata';
import { AudioProgress } from './AudioProgress';
import { AudioWaveform } from './AudioWaveform';

export type NowPlayingState = 'playing' | 'paused' | null;

export interface AudioListItemProps {
  item: AudioLibraryItem;
  onPress?: () => void;
  onLongPress?: () => void;
  onMore?: () => void;
  nowPlaying?: NowPlayingState;
  /** Download/offline indicator supplied by the downloads feature. */
  statusAccessory?: React.ReactNode;
  /** Replaces the "more" button (e.g. reorder controls, checkbox). */
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
}

function AudioListItemComponent({
  item,
  onPress,
  onLongPress,
  onMore,
  nowPlaying = null,
  statusAccessory,
  trailing,
  leading,
  selected = false,
  disabled = false,
  testID,
}: AudioListItemProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { audio } = item;
  const detail = [audioDurationLabel(item), audioSubtitle(audio)]
    .filter(Boolean)
    .join(' · ');
  const isCurrent = nowPlaying !== null;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[
        audio.title,
        detail,
        isCurrent ? t('audio.nowPlaying') : undefined,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ selected, disabled }}
      accessibilityHint={t('audio.listItemHint')}
      onPress={onPress}
      onLongPress={onLongPress ?? onMore}
      disabled={disabled}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {leading}
      <View>
        <AudioArtwork audio={audio} size="sm" />
        {isCurrent && (
          <View style={styles.nowPlaying}>
            <AudioWaveform playing={nowPlaying === 'playing'} />
          </View>
        )}
      </View>
      <View style={styles.texts}>
        <AppText
          variant="bodyStrong"
          color={isCurrent ? 'primary' : 'textPrimary'}
          numberOfLines={2}
        >
          {audio.title}
        </AppText>
        <View style={styles.detailRow}>
          {item.isFavorite && <AppIcon name="heart" size="xs" color="primary" />}
          {detail.length > 0 && (
            <AppText
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.detail}
            >
              {detail}
            </AppText>
          )}
        </View>
        <AudioProgress item={item} />
      </View>
      {statusAccessory}
      {trailing ??
        (onMore && (
          <AppIconButton
            icon="ellipsis-vertical"
            size="sm"
            color="textSecondary"
            accessibilityLabel={t('audio.moreOptions', { title: audio.title })}
            onPress={onMore}
            testID={testID ? `${testID}-more` : undefined}
          />
        ))}
    </Pressable>
  );
}

export const AudioListItem = memo(AudioListItemComponent);

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: theme.sizes.listItemMinHeight + theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  selected: { backgroundColor: theme.colors.primaryMuted },
  pressed: { backgroundColor: theme.colors.surface },
  disabled: { opacity: theme.opacity.disabled },
  nowPlaying: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: theme.spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  detail: { flex: 1 },
}));
