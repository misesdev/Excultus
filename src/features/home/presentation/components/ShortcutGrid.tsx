import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon, AppText, makeStyles, type IconName } from '@design-system';

export interface Shortcut {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}

/** Two-column grid of library shortcuts. */
export function ShortcutGrid({ shortcuts }: { shortcuts: Shortcut[] }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {shortcuts.map(shortcut => (
        <Pressable
          key={shortcut.key}
          testID={`shortcut-${shortcut.key}`}
          accessibilityRole="button"
          accessibilityLabel={shortcut.label}
          onPress={shortcut.onPress}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <AppIcon name={shortcut.icon} size="md" color="primary" />
          <AppText variant="captionStrong" numberOfLines={1} style={styles.label}>
            {shortcut.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: theme.sizes.minTouchTarget + theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pressed: { backgroundColor: theme.colors.surfaceHighlight },
  label: { flex: 1 },
}));
