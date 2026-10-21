import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { haptic } from '../animations/haptics';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import type { ColorPalette } from '../tokens';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<
  AppButtonVariant,
  {
    background: keyof ColorPalette;
    pressed: keyof ColorPalette;
    content: keyof ColorPalette;
  }
> = {
  primary: { background: 'primary', pressed: 'primaryPressed', content: 'onPrimary' },
  secondary: {
    background: 'surfaceElevated',
    pressed: 'surfaceHighlight',
    content: 'textPrimary',
  },
  ghost: { background: 'transparent', pressed: 'surfaceElevated', content: 'primary' },
  destructive: {
    background: 'errorMuted',
    pressed: 'surfaceHighlight',
    content: 'error',
  },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  testID,
  style,
}: AppButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const colors = VARIANT_COLORS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: theme.sizes.buttonHeight[size],
          paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.xl,
          backgroundColor: theme.colors[pressed ? colors.pressed : colors.background],
        },
        variant === 'secondary' && styles.outlined,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors[colors.content]}
            testID={testID ? `${testID}-loading` : undefined}
          />
        ) : (
          icon && (
            <AppIcon
              name={icon}
              size={size === 'sm' ? 'sm' : 'md'}
              color={colors.content}
            />
          )
        )}
        <AppText variant="button" color={colors.content} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  base: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.sizes.minTouchTarget,
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: theme.opacity.disabled },
}));
