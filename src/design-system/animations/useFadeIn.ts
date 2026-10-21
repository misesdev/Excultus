import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { durations, easings } from '../tokens';

/** Discrete fade/slide-in used when content replaces a loading state. */
export function useFadeIn(duration: number = durations.normal) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: easings.decelerate,
      useNativeDriver: true,
    }).start();
  }, [duration, progress]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
      },
    ],
  };
}

/** Looping pulse used by skeletons and the waveform indicator. */
export function usePulse(active: boolean, duration: number = durations.skeletonPulse) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.stopAnimation();
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: easings.inOut,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: easings.inOut,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, value]);

  return value;
}
