import React from 'react';
import { Pressable, View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { hitSlop } from '../tokens';

export interface AppSectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** "overline" is used for grouped settings/forms. */
  variant?: 'heading' | 'overline';
}

export function AppSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  variant = 'heading',
}: AppSectionHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <View style={styles.titles}>
        <AppText
          variant={variant === 'overline' ? 'overline' : 'heading'}
          color={variant === 'overline' ? 'textMuted' : 'textPrimary'}
          uppercase={variant === 'overline'}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={hitSlop}
        >
          {({ pressed }) => (
            <AppText
              variant="captionStrong"
              color={pressed ? 'primaryPressed' : 'primary'}
            >
              {actionLabel}
            </AppText>
          )}
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  titles: { flex: 1, gap: theme.spacing.xxs },
}));
