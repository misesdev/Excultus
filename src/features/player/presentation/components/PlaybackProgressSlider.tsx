import React, { useState } from 'react';
import { View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSlider, AppText, makeStyles, useTranslation } from '@design-system';
import { formatClock } from '@core/utils';
import { usePlayerStore } from '../store/playerStore';

const ACCESSIBILITY_STEP_MS = 15000;

/** Seek bar with elapsed and remaining time; seeking commits on release. */
export function PlaybackProgressSlider() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { player } = useDependencies();
  const positionMs = usePlayerStore(state => state.positionMs);
  const durationMs = usePlayerStore(state => state.durationMs);
  const rate = usePlayerStore(state => state.rate);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? positionMs;
  const remaining = Math.max(0, durationMs - shown) / (rate > 0 ? rate : 1);

  return (
    <View>
      <AppSlider
        testID="player-slider"
        value={shown}
        maximumValue={Math.max(durationMs, 1)}
        disabled={durationMs <= 0}
        onValueChange={setPreview}
        onSlidingComplete={value => {
          setPreview(null);
          player.seekTo(value);
        }}
        accessibilityLabel={t('player.position')}
        accessibilityStep={ACCESSIBILITY_STEP_MS}
        formatAccessibilityValue={value =>
          `${formatClock(value)} de ${formatClock(durationMs)}`
        }
      />
      <View style={styles.times}>
        <AppText variant="mono" color="textSecondary">
          {formatClock(shown)}
        </AppText>
        <AppText
          variant="mono"
          color="textSecondary"
          accessibilityLabel={t('player.timeLeft')}
        >
          -{formatClock(remaining)}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  times: { flexDirection: 'row', justifyContent: 'space-between' },
}));
