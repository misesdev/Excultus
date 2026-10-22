import React from 'react';
import { Pressable, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppArtwork,
  AppIconButton,
  AppProgressBar,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { useIsPlaying, usePlayerStore } from '../store/playerStore';

function MiniPlayerProgress() {
  const { t } = useTranslation();
  const ratio = usePlayerStore(state =>
    state.durationMs > 0 ? state.positionMs / state.durationMs : 0,
  );
  return (
    <AppProgressBar
      progress={ratio}
      height={2}
      accessibilityLabel={t('player.progress')}
    />
  );
}

export interface MiniPlayerProps {
  onOpen: () => void;
}

/** Persistent compact player shown above the tab bar while there is active content. */
export function MiniPlayer({ onOpen }: MiniPlayerProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { player } = useDependencies();
  const current = usePlayerStore(state => state.current);
  const isError = usePlayerStore(state => state.status === 'error');
  const isPlaying = useIsPlaying();
  const hasNext = usePlayerStore(
    state => state.queue.position < state.queue.order.length - 1,
  );

  if (!current) {
    return null;
  }
  return (
    <View style={styles.container} testID="mini-player">
      <MiniPlayerProgress />
      <Pressable
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t('player.open', { title: current.title })}
        accessibilityHint={t('player.openHint')}
      >
        <AppArtwork
          source={current.artworkPath}
          seed={current.audioId}
          size="xs"
          radius="sm"
        />
        <View style={styles.texts}>
          <AppText variant="captionStrong" numberOfLines={1}>
            {current.title}
          </AppText>
          <AppText
            variant="caption"
            color={isError ? 'error' : 'textSecondary'}
            numberOfLines={1}
          >
            {isError ? t('player.couldNotPlay') : current.subtitle ?? ' '}
          </AppText>
        </View>
        <AppIconButton
          icon={isPlaying ? 'pause' : 'play'}
          accessibilityLabel={isPlaying ? t('player.pause') : t('audioActions.play')}
          onPress={() => player.togglePlayPause()}
          testID="mini-player-toggle"
        />
        <AppIconButton
          icon="play-skip-forward"
          accessibilityLabel={t('player.next')}
          onPress={() => player.skipToNext()}
          disabled={!hasNext}
        />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  content: {
    height: theme.sizes.miniPlayerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  pressed: { backgroundColor: theme.colors.surfaceHighlight },
  texts: { flex: 1, gap: theme.spacing.xxs },
}));
