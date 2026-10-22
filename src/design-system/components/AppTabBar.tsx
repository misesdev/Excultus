import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../animations/haptics';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
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

/**
 * Navigation-agnostic tab bar; the navigator adapter maps routes to items.
 * Floating rounded dock (same surface language as cards and sheets) with a
 * highlight that slides to the focused tab.
 */
export function AppTabBar({ items, accessory }: AppTabBarProps) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focusedIndex = Math.max(
    0,
    items.findIndex(item => item.focused),
  );
  const [tabWidth, setTabWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const positioned = useRef(false);

  useEffect(() => {
    if (tabWidth === 0) {
      return;
    }
    const toValue = focusedIndex * tabWidth;
    if (!positioned.current) {
      // First layout: place the highlight without animating from the left edge.
      positioned.current = true;
      offset.setValue(toValue);
      return;
    }
    Animated.spring(offset, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [focusedIndex, offset, tabWidth]);

  const onTabsLayout = (event: LayoutChangeEvent) => {
    setTabWidth(event.nativeEvent.layout.width / Math.max(items.length, 1));
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + theme.sizes.tabBarInset },
      ]}
    >
      {accessory}
      <View style={styles.dock}>
        <View
          style={styles.tabs}
          accessibilityRole="tablist"
          testID="app-tab-bar"
          onLayout={onTabsLayout}
        >
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.highlight,
                { width: tabWidth, transform: [{ translateX: offset }] },
              ]}
            >
              <View style={styles.highlightFill} />
            </Animated.View>
          )}
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
              <AppIcon
                name={item.focused ? item.activeIcon : item.icon}
                size="md"
                color={item.focused ? 'primary' : 'textMuted'}
              />
              <AppText
                variant="label"
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
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  dock: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xs,
    ...theme.shadows.high,
  },
  tabs: {
    flexDirection: 'row',
    height: theme.sizes.tabBarHeight - theme.spacing.xs * 2 - 2,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: theme.spacing.xxs,
  },
  highlightFill: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryMuted,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    borderRadius: theme.radius.lg,
  },
  pressed: { opacity: theme.opacity.pressed, transform: [{ scale: 0.96 }] },
}));
