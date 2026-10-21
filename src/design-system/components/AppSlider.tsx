import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export interface AppSliderProps {
  value: number;
  maximumValue: number;
  /** Fired continuously while dragging (preview only). */
  onValueChange?: (value: number) => void;
  /** Fired once when the gesture ends; commit side effects here. */
  onSlidingComplete: (value: number) => void;
  onSlidingStart?: () => void;
  /** Step used by accessibility increment/decrement actions. */
  accessibilityStep: number;
  accessibilityLabel: string;
  formatAccessibilityValue?: (value: number) => string;
  disabled?: boolean;
  testID?: string;
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export function AppSlider({
  value,
  maximumValue,
  onValueChange,
  onSlidingComplete,
  onSlidingStart,
  accessibilityStep,
  accessibilityLabel,
  formatAccessibilityValue,
  disabled = false,
  testID,
}: AppSliderProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const startX = useRef(0);
  const latest = useRef({
    width,
    maximumValue,
    onValueChange,
    onSlidingComplete,
    onSlidingStart,
  });
  latest.current = {
    width,
    maximumValue,
    onValueChange,
    onSlidingComplete,
    onSlidingStart,
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: event => {
          const { width: w, maximumValue: max } = latest.current;
          // Gesture deltas are relative to the touch start, which keeps the
          // position stable even when the finger leaves the track vertically.
          startX.current = event.nativeEvent.locationX;
          const next = clamp((startX.current / Math.max(1, w)) * max, max);
          latest.current.onSlidingStart?.();
          setDragValue(next);
          latest.current.onValueChange?.(next);
        },
        onPanResponderMove: (_event, gesture) => {
          const { width: w, maximumValue: max } = latest.current;
          const next = clamp(((startX.current + gesture.dx) / Math.max(1, w)) * max, max);
          setDragValue(next);
          latest.current.onValueChange?.(next);
        },
        onPanResponderRelease: (_event, gesture) => {
          const { width: w, maximumValue: max } = latest.current;
          const next = clamp(((startX.current + gesture.dx) / Math.max(1, w)) * max, max);
          setDragValue(null);
          latest.current.onSlidingComplete(next);
        },
        onPanResponderTerminate: () => setDragValue(null),
      }),
    [disabled],
  );

  const shown = dragValue ?? value;
  const ratio = maximumValue > 0 ? clamp(shown, maximumValue) / maximumValue : 0;
  const thumb =
    dragValue !== null ? theme.sizes.sliderThumbActive : theme.sizes.sliderThumb;

  return (
    <View
      testID={testID}
      style={[styles.touchArea, disabled && styles.disabled]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: formatAccessibilityValue?.(shown) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        const delta =
          event.nativeEvent.actionName === 'increment'
            ? accessibilityStep
            : -accessibilityStep;
        onSlidingComplete(clamp(value + delta, maximumValue));
      }}
      {...responder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            left: ratio * width - thumb / 2,
          },
        ]}
      />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  touchArea: { height: theme.sizes.minTouchTarget, justifyContent: 'center' },
  track: {
    height: theme.sizes.sliderTrackHeight,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceHighlight,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.colors.primary },
  thumb: {
    position: 'absolute',
    backgroundColor: theme.colors.textPrimary,
    ...theme.shadows.low,
  },
  disabled: { opacity: theme.opacity.disabled },
}));
