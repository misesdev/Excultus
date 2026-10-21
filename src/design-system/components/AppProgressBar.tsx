import React from 'react';
import { View } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { ColorPalette } from '../tokens';

export interface AppProgressBarProps {
  /** 0..1; values outside are clamped. */
  progress: number;
  color?: keyof ColorPalette;
  height?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function AppProgressBar({
  progress,
  color = 'primary',
  height,
  accessibilityLabel,
  testID,
}: AppProgressBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const barHeight = height ?? theme.sizes.progressBarHeight;
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height: barHeight, borderRadius: barHeight / 2 }]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: barHeight,
          borderRadius: barHeight / 2,
          backgroundColor: theme.colors[color],
        }}
      />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  track: { backgroundColor: theme.colors.surfaceHighlight, overflow: 'hidden' },
}));
