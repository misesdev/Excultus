import React, { type ReactElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@design-system';
import { BookmarksScreen } from '@features/bookmarks/presentation';
import {
  CollectionDetailScreen,
  CollectionFormScreen,
} from '@features/collections/presentation';
import { HistoryScreen } from '@features/history/presentation';
import { ImportScreen } from '@features/imports/presentation';
import { AudioPickerScreen, LibraryScreen } from '@features/library/presentation';
import {
  FullPlayerScreen,
  MiniPlayer,
  useIsActivePlayer,
} from '@features/player/presentation';
import { listStyles } from '@shared/styles/listStyles';
import {
  PlaylistDetailScreen,
  PlaylistFormScreen,
  PlaylistsScreen,
} from '@features/playlists/presentation';
import { MainTabs } from './MainTabs';
import { Routes, useAppNavigation, type RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Detail screens keep the mini player docked at the bottom (tabs render their own). */
function WithMiniPlayer({ children }: { children: ReactElement }) {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const active = useIsActivePlayer();
  return (
    <View style={listStyles.flex}>
      <View style={listStyles.flex}>{children}</View>
      {active && (
        <View style={{ paddingBottom: insets.bottom }}>
          <MiniPlayer onOpen={() => navigation.navigate(Routes.Player)} />
        </View>
      )}
    </View>
  );
}

const renderWithMiniPlayer = ({ children }: { children: ReactElement }) => (
  <WithMiniPlayer>{children}</WithMiniPlayer>
);

export function RootNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name={Routes.MainTabs} component={MainTabs} />
      <Stack.Screen
        name={Routes.Player}
        component={FullPlayerScreen}
        options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
      />
      <Stack.Screen
        name={Routes.Import}
        component={ImportScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Group screenLayout={renderWithMiniPlayer}>
        <Stack.Screen name={Routes.CollectionDetail} component={CollectionDetailScreen} />
        <Stack.Screen name={Routes.Library} component={LibraryScreen} />
        <Stack.Screen name={Routes.Playlists} component={PlaylistsScreen} />
        <Stack.Screen name={Routes.PlaylistDetail} component={PlaylistDetailScreen} />
        <Stack.Screen name={Routes.Bookmarks} component={BookmarksScreen} />
        <Stack.Screen name={Routes.History} component={HistoryScreen} />
      </Stack.Group>
      <Stack.Screen
        name={Routes.CollectionForm}
        component={CollectionFormScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={Routes.AudioPicker}
        component={AudioPickerScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={Routes.PlaylistForm}
        component={PlaylistFormScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
