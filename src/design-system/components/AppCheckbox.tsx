import React from 'react';
import { Pressable, View } from 'react-native';
import { haptic } from '../animations/haptics';
import { AppIcon } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { hitSlop } from '../tokens';

export interface AppCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Mixed state used by "select all" when only some items are selected. */
  indeterminate?: boolean;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

export function AppCheckbox({
  checked,
  onChange,
  indeterminate = false,
  accessibilityLabel,
  disabled = false,
  testID,
}: AppCheckboxProps) {
  const styles = useStyles();
  const active = checked || indeterminate;
  const box = (
    <View style={[styles.box, active && styles.checked, disabled && styles.disabled]}>
      {active && (
        <AppIcon
          name={indeterminate && !checked ? 'remove' : 'checkmark'}
          size="xs"
          color="onPrimary"
        />
      )}
    </View>
  );

  if (!onChange) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{
          checked: indeterminate && !checked ? 'mixed' : checked,
          disabled,
        }}
      >
        {box}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        checked: indeterminate && !checked ? 'mixed' : checked,
        disabled,
      }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        haptic('selection');
        onChange(!checked);
      }}
    >
      {box}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  box: {
    width: theme.sizes.checkbox,
    height: theme.sizes.checkbox,
    borderRadius: theme.radius.xs + 2,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  disabled: { opacity: theme.opacity.disabled },
}));
