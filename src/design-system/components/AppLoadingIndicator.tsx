import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';

export interface AppLoadingIndicatorProps {
  label?: string;
  /** Fills the available space and centers the indicator. */
  fill?: boolean;
  size?: 'small' | 'large';
}

export function AppLoadingIndicator({
  label,
  fill = false,
  size = 'large',
}: AppLoadingIndicatorProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[styles.root, fill && styles.fill]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Carregando'}
      testID="loading-indicator"
    >
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {label && (
        <AppText variant="caption" color="textSecondary" align="center">
          {label}
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  fill: { flex: 1 },
}));
