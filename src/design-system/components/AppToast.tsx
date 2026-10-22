import React from 'react';
import { Animated, View } from 'react-native';
import { useFadeIn } from '../animations/useFadeIn';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import type { ColorPalette } from '../tokens';

export type AppToastTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<AppToastTone, { icon: IconName; color: keyof ColorPalette }> = {
  info: { icon: 'information-circle', color: 'primary' },
  success: { icon: 'checkmark-circle', color: 'success' },
  warning: { icon: 'warning', color: 'warning' },
  error: { icon: 'alert-circle', color: 'error' },
};

export interface AppToastProps {
  message: string;
  tone?: AppToastTone;
}

/** Short, non-interactive confirmation message. */
export function AppToast({ message, tone = 'info' }: AppToastProps) {
  const styles = useStyles();
  const fade = useFadeIn();
  const { icon, color } = TONES[tone];
  return (
    <Animated.View
      style={[styles.toast, fade]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="toast"
    >
      <AppIcon name={icon} size="sm" color={color} />
      <AppText variant="captionStrong" style={styles.message}>
        {message}
      </AppText>
    </Animated.View>
  );
}

export interface AppSnackbarProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  tone?: AppToastTone;
}

/** Message with a single follow-up action (e.g. "Try again"). */
export function AppSnackbar({
  message,
  actionLabel,
  onAction,
  tone = 'info',
}: AppSnackbarProps) {
  const styles = useStyles();
  const fade = useFadeIn();
  const { icon, color } = TONES[tone];
  return (
    <Animated.View
      style={[styles.toast, fade]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="snackbar"
    >
      <AppIcon name={icon} size="sm" color={color} />
      <AppText variant="captionStrong" style={styles.message}>
        {message}
      </AppText>
      <View>
        <AppText
          variant="captionStrong"
          color="primary"
          accessibilityRole="button"
          onPress={onAction}
          suppressHighlighting
          style={styles.action}
        >
          {actionLabel}
        </AppText>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(theme => ({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    ...theme.shadows.high,
  },
  message: { flex: 1 },
  action: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.xs },
}));
