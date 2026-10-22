import React, { useState } from 'react';
import { Animated, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { useAppNavigation } from '@app/navigation/routes';
import {
  AppArtwork,
  AppButton,
  AppChip,
  AppEmptyState,
  AppHeader,
  AppIconButton,
  AppScreen,
  AppText,
  makeStyles,
  useFadeIn,
  useTheme,
  useTranslation,
} from '@design-system';
import { getUserMessageForCode } from '@core/errors';
import { formatClock } from '@core/utils';
import { openAudioActions } from '@features/audios/presentation';
import { AudioBookmarksSheet } from '@features/bookmarks/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { remainingTimerMs } from '../../index';
import { PlaybackControls } from '../components/PlaybackControls';
import { PlaybackProgressSlider } from '../components/PlaybackProgressSlider';
import { PlaybackQueue } from '../components/PlaybackQueue';
import { formatSpeed, PlaybackSpeedSelector } from '../components/PlaybackSpeedSelector';
import { SleepTimerSelector } from '../components/SleepTimerSelector';
import { usePlayerStore } from '../store/playerStore';

type Sheet = 'speed' | 'timer' | 'queue' | 'bookmarks' | null;

const MAX_ARTWORK_SIZE = 340;

function SleepTimerChip({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const timer = usePlayerStore(state => state.sleepTimer);
  // Re-render with the progress tick so the countdown stays current.
  usePlayerStore(state => Math.floor(state.positionMs / 1000));
  const remaining = remainingTimerMs(timer, Date.now());
  const label =
    timer?.kind === 'end-of-track'
      ? t('player.timer.endOfTrackShort')
      : remaining !== undefined
      ? formatClock(remaining)
      : t('player.timer.chip');
  return (
    <AppChip
      label={label}
      icon="moon-outline"
      selected={!!timer}
      onPress={onPress}
      testID="player-timer"
    />
  );
}

function RepeatButton() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { player } = useDependencies();
  const mode = usePlayerStore(state => state.repeatMode);
  const labels = {
    off: t('player.repeat.off'),
    all: t('player.repeat.all'),
    one: t('player.repeat.one'),
  } as const;
  return (
    <View>
      <AppIconButton
        icon="repeat"
        selected={mode !== 'off'}
        accessibilityLabel={labels[mode]}
        onPress={() => player.cycleRepeatMode()}
        testID="player-repeat"
      />
      {mode === 'one' && (
        <View style={styles.repeatBadge} pointerEvents="none">
          <AppText variant="overline" color="onPrimary">
            1
          </AppText>
        </View>
      )}
    </View>
  );
}

/** Immersive player. Primary controls sit in the lower half for one-hand use. */
export function FullPlayerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useAppNavigation();
  const { player, audios } = useDependencies();
  const fade = useFadeIn();
  const [sheet, setSheet] = useState<Sheet>(null);
  const current = usePlayerStore(state => state.current);
  const status = usePlayerStore(state => state.status);
  const errorCode = usePlayerStore(state => state.errorCode);
  const contextLabel = usePlayerStore(state => state.contextLabel);
  const rate = usePlayerStore(state => state.rate);
  const shuffled = usePlayerStore(state => state.queue.shuffled);
  const audioId = current?.audioId;
  const { data: item } = useQuery(
    () => (audioId ? audios.getItem(audioId) : Promise.resolve(undefined)),
    [audioId],
    ['library'],
  );
  const toggleFavorite = useAsyncAction((id: string) => audios.toggleFavorite(id));

  if (!current) {
    return (
      <AppScreen>
        <AppHeader onBack={navigation.goBack} backIcon="chevron-down" />
        <AppEmptyState
          icon="musical-notes-outline"
          title={t('player.nothingPlaying')}
          description={t('player.nothingPlayingDescription')}
          actionLabel={t('common.back')}
          onAction={navigation.goBack}
        />
      </AppScreen>
    );
  }

  const artworkSize = Math.min(width - theme.spacing.xxl * 2, MAX_ARTWORK_SIZE);

  return (
    <AppScreen testID="full-player">
      <AppHeader
        title={t('player.nowPlaying')}
        subtitle={contextLabel}
        onBack={navigation.goBack}
        backIcon="chevron-down"
        actions={
          <AppIconButton
            icon="ellipsis-horizontal"
            accessibilityLabel={t('common.moreOptions')}
            disabled={!item}
            onPress={() => item && openAudioActions(item, { fromPlayer: true })}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.artwork, fade]}>
          <AppArtwork
            source={current.artworkPath}
            seed={current.audioId}
            size={artworkSize}
            radius="xl"
            accessibilityLabel={t('audio.cover', { title: current.title })}
          />
        </Animated.View>

        <View style={styles.titleRow}>
          <View style={styles.titles}>
            <AppText variant="title" numberOfLines={2} accessibilityRole="header">
              {current.title}
            </AppText>
            {current.subtitle && (
              <AppText variant="body" color="textSecondary" numberOfLines={1}>
                {current.subtitle}
              </AppText>
            )}
          </View>
          <AppIconButton
            icon={item?.isFavorite ? 'heart' : 'heart-outline'}
            selected={item?.isFavorite}
            color={item?.isFavorite ? 'primary' : 'textSecondary'}
            accessibilityLabel={
              item?.isFavorite
                ? t('audioActions.removeFavorite')
                : t('audioActions.addFavorite')
            }
            onPress={() => toggleFavorite.run(current.audioId)}
            testID="player-favorite"
          />
        </View>

        {status === 'error' && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <AppText variant="caption" color="error" style={styles.errorText}>
              {getUserMessageForCode(errorCode ?? 'audio-playback')}
            </AppText>
            <AppButton
              label={t('common.retry')}
              size="sm"
              variant="ghost"
              onPress={() => player.resume()}
            />
          </View>
        )}

        <PlaybackProgressSlider />
        <PlaybackControls />

        <View style={styles.secondaryRow}>
          <AppChip
            label={formatSpeed(rate)}
            icon="speedometer-outline"
            onPress={() => setSheet('speed')}
            testID="player-speed"
          />
          <SleepTimerChip onPress={() => setSheet('timer')} />
        </View>
        <View style={styles.toolsRow}>
          <AppIconButton
            icon="shuffle"
            selected={shuffled}
            accessibilityLabel={shuffled ? t('player.shuffleOff') : t('player.shuffleOn')}
            onPress={() => player.toggleShuffle()}
            testID="player-shuffle"
          />
          <RepeatButton />
          <AppIconButton
            icon="bookmark-outline"
            accessibilityLabel={t('home.shortcuts.bookmarks')}
            onPress={() => setSheet('bookmarks')}
            testID="player-bookmarks"
          />
          <AppIconButton
            icon="list"
            accessibilityLabel={t('player.queue')}
            onPress={() => setSheet('queue')}
            testID="player-queue"
          />
        </View>
      </ScrollView>

      <PlaybackSpeedSelector visible={sheet === 'speed'} onClose={() => setSheet(null)} />
      <SleepTimerSelector visible={sheet === 'timer'} onClose={() => setSheet(null)} />
      <PlaybackQueue visible={sheet === 'queue'} onClose={() => setSheet(null)} />
      <AudioBookmarksSheet
        visible={sheet === 'bookmarks'}
        audioId={current.audioId}
        getPositionMs={() => player.getState().positionMs}
        onSeek={positionMs => player.seekTo(positionMs)}
        onClose={() => setSheet(null)}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  content: { paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg },
  artwork: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    ...theme.shadows.high,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  titles: { flex: 1, gap: theme.spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.md,
    paddingLeft: theme.spacing.md,
  },
  errorText: { flex: 1 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  repeatBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    minWidth: theme.iconSizes.xs,
    height: theme.iconSizes.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
