import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../animations/haptics';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';

export interface AppTabBarItem {
  key: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

export interface AppTabBarProps {
  items: AppTabBarItem[];
  /** Rendered above the tabs (e.g. the mini player). */
  accessory?: React.ReactNode;
}

/** Navigation-agnostic tab bar; the navigator adapter maps routes to items. */
export function AppTabBar({ items, accessory }: AppTabBarProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      {accessory}
      <View
        style={[styles.bar, { paddingBottom: insets.bottom }]}
        accessibilityRole="tablist"
      >
        {items.map(item => (
          <Pressable
            key={item.key}
            testID={item.testID}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: item.focused }}
            onPress={() => {
              if (!item.focused) {
                haptic('selection');
              }
              item.onPress();
            }}
            onLongPress={item.onLongPress}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.iconPill, item.focused && styles.iconPillActive]}>
              <AppIcon
                name={item.focused ? item.activeIcon : item.icon}
                size="md"
                color={item.focused ? 'primary' : 'textMuted'}
              />
            </View>
            <AppText
              variant="overline"
              color={item.focused ? 'textPrimary' : 'textMuted'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {item.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: { backgroundColor: theme.colors.background },
  bar: {
    flexDirection: 'row',
    minHeight: theme.sizes.tabBarHeight,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    paddingVertical: theme.spacing.sm,
  },
  pressed: { opacity: theme.opacity.pressed },
  iconPill: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
  },
  iconPillActive: { backgroundColor: theme.colors.primaryMuted },
}));
