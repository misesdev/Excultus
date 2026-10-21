import React from 'react';
import { Pressable } from 'react-native';
import { haptic } from '../animations/haptics';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';

export interface AppChipProps {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export function AppChip({
  label,
  selected = false,
  icon,
  onPress,
  disabled,
  testID,
}: AppChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={() => {
        haptic('selection');
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && (
        <AppIcon name={icon} size="xs" color={selected ? 'onPrimary' : 'textSecondary'} />
      )}
      <AppText variant="captionStrong" color={selected ? 'onPrimary' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  chip: {
    height: theme.sizes.chipHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  selected: { backgroundColor: theme.colors.primary },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
}));
