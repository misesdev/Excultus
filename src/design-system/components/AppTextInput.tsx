import React, { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { MAX_FONT_SIZE_MULTIPLIER } from '../tokens';

export interface AppTextInputProps
  extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: IconName;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

export const AppTextInput = forwardRef<
  React.ComponentRef<typeof TextInput>,
  AppTextInputProps
>(function AppTextInputField(
  {
    label,
    error,
    helperText,
    leadingIcon,
    trailing,
    disabled,
    multiline,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.primary
    : theme.colors.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <AppText variant="captionStrong" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { borderColor },
          disabled && styles.disabled,
        ]}
      >
        {leadingIcon && <AppIcon name={leadingIcon} size="sm" color="textMuted" />}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          editable={!disabled}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          cursorColor={theme.colors.primary}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {trailing}
      </View>
      {(error || helperText) && (
        <AppText
          variant="caption"
          color={error ? 'error' : 'textMuted'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={styles.helper}
        >
          {error ?? helperText}
        </AppText>
      )}
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  wrapper: { gap: theme.spacing.xs },
  label: { marginLeft: theme.spacing.xs },
  field: {
    minHeight: theme.sizes.inputHeight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: theme.spacing.md },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    paddingVertical: theme.spacing.sm,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  helper: { marginLeft: theme.spacing.xs },
  disabled: { opacity: theme.opacity.disabled },
}));
