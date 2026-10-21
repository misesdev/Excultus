import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppSnackbar, AppToast, durations, useTheme } from '@design-system';
import { useFeedbackStore } from './feedbackStore';

const SNACKBAR_DURATION_MULTIPLIER = 2;

/** Renders the current toast/snackbar above the tab bar and mini player. */
export function FeedbackHost() {
  const current = useFeedbackStore(state => state.current);
  const dismiss = useFeedbackStore(state => state.dismiss);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (!current) {
      return;
    }
    const duration = current.action
      ? durations.toast * SNACKBAR_DURATION_MULTIPLIER
      : durations.toast;
    const timer = setTimeout(() => dismiss(current.id), duration);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) {
    return null;
  }
  const bottom =
    insets.bottom +
    theme.sizes.tabBarHeight +
    theme.sizes.miniPlayerHeight +
    theme.spacing.lg;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {current.action ? (
        <AppSnackbar
          message={current.message}
          tone={current.tone}
          actionLabel={current.action.label}
          onAction={() => {
            dismiss(current.id);
            current.action?.onPress();
          }}
        />
      ) : (
        <AppToast message={current.message} tone={current.tone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0 },
});
