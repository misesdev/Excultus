import { create } from 'zustand';
import type { Unsubscribe } from '@core/types';
import {
  aggregateProgress,
  type ActiveDownloadState,
  type DownloadManager,
  type DownloadSnapshot,
} from '../index';

/** Projection of the DownloadManager runtime state (active queue + progress). */
export const useDownloadsStore = create<DownloadSnapshot>(() => ({
  byAudioId: {},
  aggregate: aggregateProgress([]),
  waitingForNetwork: false,
}));

export function bindDownloadsStore(manager: DownloadManager): Unsubscribe {
  return manager.subscribe(snapshot => useDownloadsStore.setState(snapshot, true));
}

export function useActiveDownload(audioId: string): ActiveDownloadState | undefined {
  return useDownloadsStore(state => state.byAudioId[audioId]);
}
