import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppIconButton,
  haptic,
  makeStyles,
  useTheme,
  type IconName,
} from '@design-system';
import { useSettings } from '@shared/hooks/useSettings';
import { usePlayerStore } from '../store/playerStore';

const SKIP_BACK_ICON: IconName = 'play-back';
const SKIP_FORWARD_ICON: IconName = 'play-forward';

/** Main transport row: previous, rewind, play/pause, forward, next. */
export function PlaybackControls() {
  const theme = useTheme();
  const styles = useStyles();
  const { player } = useDependencies();
  const status = usePlayerStore(state => state.status);
  const playing = status === 'playing' || status === 'buffering';
  const loading = status === 'loading' || status === 'buffering';
  const { skipBackwardSec, skipForwardSec } = useSettings().playback;

  return (
    <View style={styles.row}>
      <AppIconButton
        icon="play-skip-back"
        size="lg"
        accessibilityLabel="Faixa anterior"
        onPress={() => player.skipToPrevious()}
        testID="player-previous"
      />
      <AppIconButton
        icon={SKIP_BACK_ICON}
        size="lg"
        accessibilityLabel={`Voltar ${skipBackwardSec} segundos`}
        onPress={() => player.skipBackward()}
        testID="player-rewind"
      />
      <View>
        <AppIconButton
          icon={playing ? 'pause' : 'play'}
          size="xl"
          iconSize="xl"
          variant="filled"
          accessibilityLabel={playing ? 'Pausar' : 'Reproduzir'}
          onPress={() => {
            haptic('medium');
            player.togglePlayPause();
          }}
          testID="player-toggle"
        />
        {loading && (
          <View style={styles.spinner} pointerEvents="none">
            <ActivityIndicator color={theme.colors.onPrimary} size="large" />
          </View>
        )}
      </View>
      <AppIconButton
        icon={SKIP_FORWARD_ICON}
        size="lg"
        accessibilityLabel={`Avançar ${skipForwardSec} segundos`}
        onPress={() => player.skipForward()}
        testID="player-forward"
      />
      <AppIconButton
        icon="play-skip-forward"
        size="lg"
        accessibilityLabel="Próxima faixa"
        onPress={() => player.skipToNext()}
        testID="player-next"
      />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: theme.opacity.muted,
  },
}));
