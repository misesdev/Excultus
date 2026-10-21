import React from 'react';
import { Animated, View } from 'react-native';
import { useFadeIn } from '../animations/useFadeIn';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { AppButton } from './AppButton';

export interface AppEmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  testID?: string;
}

export function AppEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  testID = 'empty-state',
}: AppEmptyStateProps) {
  const styles = useStyles();
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.root, compact && styles.compact, fade]} testID={testID}>
      <View style={styles.iconHalo}>
        <AppIcon name={icon} size="xl" color="primary" />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description && (
        <AppText
          variant="body"
          color="textSecondary"
          align="center"
          style={styles.description}
        >
          {description}
        </AppText>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <AppButton label={actionLabel} onPress={onAction} />
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <AppButton
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="ghost"
            />
          )}
        </View>
      )}
    </Animated.View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  compact: { flex: 0, paddingVertical: theme.spacing.xl },
  iconHalo: {
    width: theme.iconSizes.hero + theme.spacing.xl,
    height: theme.iconSizes.hero + theme.spacing.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: { maxWidth: theme.sizes.maxContentWidth },
  actions: { marginTop: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center' },
}));
