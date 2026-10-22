import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type { TranslationKey } from '@core/i18n';
import { AppTabBar, useTranslation, type IconName } from '@design-system';
import { CollectionsScreen } from '@features/collections/presentation';
import { DownloadsScreen } from '@features/downloads/presentation';
import { HomeScreen } from '@features/home/presentation';
import { MiniPlayer } from '@features/player/presentation';
import { SettingsScreen } from '@features/settings/presentation';
import { Routes, type TabParamList } from './routes';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<
  keyof TabParamList,
  { label: TranslationKey; icon: IconName; activeIcon: IconName }
> = {
  [Routes.HomeTab]: { label: 'tabs.home', icon: 'home-outline', activeIcon: 'home' },
  [Routes.CollectionsTab]: {
    label: 'tabs.collections',
    icon: 'albums-outline',
    activeIcon: 'albums',
  },
  [Routes.DownloadsTab]: {
    label: 'tabs.downloads',
    icon: 'arrow-down-circle-outline',
    activeIcon: 'arrow-down-circle',
  },
  [Routes.SettingsTab]: {
    label: 'tabs.settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
};

/** Adapts React Navigation's tab bar contract to the design-system tab bar. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  return (
    <AppTabBar
      accessory={
        <MiniPlayer onOpen={() => navigation.getParent()?.navigate(Routes.Player)} />
      }
      items={state.routes.map((route, index) => {
        const meta = TAB_META[route.name as keyof TabParamList];
        const focused = state.index === index;
        return {
          key: route.key,
          label: t(meta.label),
          icon: meta.icon,
          activeIcon: meta.activeIcon,
          focused,
          testID: `tab-${route.name}`,
          onPress: () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          },
          onLongPress: () => navigation.emit({ type: 'tabLongPress', target: route.key }),
        };
      })}
    />
  );
}

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      <Tab.Screen name={Routes.HomeTab} component={HomeScreen} />
      <Tab.Screen name={Routes.CollectionsTab} component={CollectionsScreen} />
      <Tab.Screen name={Routes.DownloadsTab} component={DownloadsScreen} />
      <Tab.Screen name={Routes.SettingsTab} component={SettingsScreen} />
    </Tab.Navigator>
  );
}
