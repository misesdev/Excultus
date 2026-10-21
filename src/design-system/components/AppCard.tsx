import React, { type PropsWithChildren } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';

export interface AppCardProps {
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'surface' | 'elevated' | 'outlined';
  padded?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}

export function AppCard({
  children,
  onPress,
  onLongPress,
  variant = 'surface',
  padded = true,
  accessibilityLabel,
  testID,
  style,
}: PropsWithChildren<AppCardProps>) {
  const styles = useStyles();
  const baseStyle = [styles.base, styles[variant], padded && styles.padded, style];

  if (!onPress && !onLongPress) {
    return (
      <View style={baseStyle} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [...baseStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  base: { borderRadius: theme.radius.lg, overflow: 'hidden' },
  surface: { backgroundColor: theme.colors.surface },
  elevated: { backgroundColor: theme.colors.surfaceElevated, ...theme.shadows.medium },
  outlined: { borderWidth: 1, borderColor: theme.colors.border },
  padded: { padding: theme.spacing.lg },
  pressed: { opacity: theme.opacity.pressed, transform: [{ scale: 0.99 }] },
}));
