import React from 'react';
import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { haptic } from '../animations/haptics';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { hitSlop, type ColorPalette, type IconSize } from '../tokens';

export type AppIconButtonVariant = 'plain' | 'tonal' | 'filled';

export interface AppIconButtonProps {
  icon: IconName;
  /** Required: icon-only controls must be described for screen readers. */
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
  variant?: AppIconButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconSize?: IconSize;
  color?: keyof ColorPalette;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
}

const ICON_SIZE_FOR_BUTTON = { sm: 'sm', md: 'md', lg: 'lg', xl: 'xl' } as const;

export function AppIconButton({
  icon,
  accessibilityLabel,
  onPress,
  onLongPress,
  variant = 'plain',
  size = 'md',
  iconSize,
  color,
  selected = false,
  disabled = false,
  loading = false,
  testID,
  style,
}: AppIconButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const dimension = theme.sizes.iconButton[size];
  const contentColor: keyof ColorPalette =
    color ?? (variant === 'filled' ? 'onPrimary' : selected ? 'primary' : 'textPrimary');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, selected, busy: loading }}
      disabled={disabled || loading}
      hitSlop={hitSlop}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension },
        variant === 'tonal' && {
          backgroundColor: selected
            ? theme.colors.primaryMuted
            : theme.colors.surfaceElevated,
        },
        variant === 'filled' && {
          backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
        },
        variant === 'plain' && selected && { backgroundColor: theme.colors.primaryMuted },
        pressed && variant !== 'filled' && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors[contentColor]} />
      ) : (
        <AppIcon
          name={icon}
          size={iconSize ?? ICON_SIZE_FOR_BUTTON[size]}
          color={contentColor}
        />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  base: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: theme.colors.surfaceHighlight },
  disabled: { opacity: theme.opacity.disabled },
}));
