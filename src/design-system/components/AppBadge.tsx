import React from 'react';
import { View } from 'react-native';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import type { ColorPalette } from '../tokens';

export type AppBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

const TONE_COLORS: Record<AppBadgeTone, keyof ColorPalette> = {
  neutral: 'textSecondary',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

export interface AppBadgeProps {
  label: string;
  tone?: AppBadgeTone;
  icon?: IconName;
  testID?: string;
}

export function AppBadge({ label, tone = 'neutral', icon, testID }: AppBadgeProps) {
  const theme = useTheme();
  const styles = useStyles();
  const color = TONE_COLORS[tone];
  return (
    <View
      testID={testID}
      style={[styles.badge, { borderColor: theme.colors[color] }]}
      accessibilityLabel={label}
    >
      {icon && <AppIcon name={icon} size="xs" color={color} />}
      <AppText variant="mono" color={color} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  badge: {
    minHeight: theme.sizes.badgeHeight,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
}));
