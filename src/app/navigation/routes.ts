import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LibraryFilter } from '@features/search';

/** Single source of route names; screens never use string literals. */
export const Routes = {
  MainTabs: 'MainTabs',
  HomeTab: 'HomeTab',
  CollectionsTab: 'CollectionsTab',
  DownloadsTab: 'DownloadsTab',
  SettingsTab: 'SettingsTab',
  Player: 'Player',
  Import: 'Import',
  CollectionDetail: 'CollectionDetail',
  CollectionForm: 'CollectionForm',
  AudioPicker: 'AudioPicker',
  Library: 'Library',
  Playlists: 'Playlists',
  PlaylistDetail: 'PlaylistDetail',
  PlaylistForm: 'PlaylistForm',
  Bookmarks: 'Bookmarks',
  History: 'History',
} as const;

export type TabParamList = {
  [Routes.HomeTab]: undefined;
  [Routes.CollectionsTab]: undefined;
  [Routes.DownloadsTab]: undefined;
  [Routes.SettingsTab]: undefined;
};

export interface AudioPickerTarget {
  kind: 'collection' | 'playlist';
  id: string;
  name: string;
}

export type RootStackParamList = {
  [Routes.MainTabs]: NavigatorScreenParams<TabParamList> | undefined;
  [Routes.Player]: undefined;
  [Routes.Import]: { collectionId?: string } | undefined;
  [Routes.CollectionDetail]: { collectionId: string };
  [Routes.CollectionForm]: { collectionId?: string } | undefined;
  [Routes.AudioPicker]: { target: AudioPickerTarget };
  [Routes.Library]: { filter?: LibraryFilter; title?: string } | undefined;
  [Routes.Playlists]: undefined;
  [Routes.PlaylistDetail]: { playlistId: string };
  [Routes.PlaylistForm]: { playlistId?: string } | undefined;
  [Routes.Bookmarks]: undefined;
  [Routes.History]: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}

export function useAppRoute<Name extends keyof RootStackParamList>(): RouteProp<
  RootStackParamList,
  Name
> {
  return useRoute<RouteProp<RootStackParamList, Name>>();
}
