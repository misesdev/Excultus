import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { makeStyles, useTheme } from '@design-system';

const BAR_COUNT = 4;
const BAR_DURATIONS = [420, 560, 380, 500];

/**
 * "Now playing" indicator: animated bars while playing, frozen when paused.
 * Purely decorative for screen readers (state is announced elsewhere).
 */
export function AudioWaveform({ playing }: { playing: boolean }) {
  const theme = useTheme();
  const styles = useStyles();
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.4)),
  ).current;
  const { minHeight, maxHeight } = theme.sizes.waveformBar;

  const loops = useMemo(
    () =>
      bars.map((value, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: BAR_DURATIONS[index] ?? theme.durations.normal,
              useNativeDriver: false,
            }),
            Animated.timing(value, {
              toValue: 0.25,
              duration: BAR_DURATIONS[index] ?? theme.durations.normal,
              useNativeDriver: false,
            }),
          ]),
        ),
      ),
    [bars, theme.durations.normal],
  );

  useEffect(() => {
    if (playing) {
      loops.forEach(loop => loop.start());
    } else {
      loops.forEach(loop => loop.stop());
    }
    return () => loops.forEach(loop => loop.stop());
  }, [loops, playing]);

  return (
    <View
      style={styles.root}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: value.interpolate({
                inputRange: [0, 1],
                outputRange: [minHeight, maxHeight],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.sizes.waveformBar.gap,
    height: theme.sizes.waveformBar.maxHeight,
  },
  bar: {
    width: theme.sizes.waveformBar.width,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
}));
