import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import type { ColorPalette } from '../tokens';

export interface AppListItemProps {
  title: string;
  subtitle?: string;
  /** Third line, e.g. metadata. */
  caption?: string;
  leading?: React.ReactNode;
  leadingIcon?: IconName;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  titleColor?: keyof ColorPalette;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
}

export function AppListItem({
  title,
  subtitle,
  caption,
  leading,
  leadingIcon,
  trailing,
  showChevron,
  onPress,
  onLongPress,
  selected = false,
  disabled = false,
  destructive = false,
  titleColor,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: AppListItemProps) {
  const styles = useStyles();
  const resolvedTitleColor =
    titleColor ?? (destructive ? 'error' : selected ? 'primary' : 'textPrimary');
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled || (!onPress && !onLongPress)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leading ??
        (leadingIcon && (
          <View style={styles.iconBox}>
            <AppIcon
              name={leadingIcon}
              size="md"
              color={destructive ? 'error' : 'textSecondary'}
            />
          </View>
        ))}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={resolvedTitleColor} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
        {caption && (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {caption}
          </AppText>
        )}
      </View>
      {trailing}
      {showChevron && <AppIcon name="chevron-forward" size="sm" color="textMuted" />}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: theme.sizes.listItemMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  selected: { backgroundColor: theme.colors.primaryMuted },
  pressed: { backgroundColor: theme.colors.surface },
  disabled: { opacity: theme.opacity.disabled },
  iconBox: {
    width: theme.sizes.iconButton.md,
    height: theme.sizes.iconButton.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: theme.spacing.xxs },
}));
