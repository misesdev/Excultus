import { create } from 'zustand';
import type { AudioLibraryItem } from '../../domain/entities/AudioLibraryItem';

/** Where the menu was opened from; enables contextual actions. */
export interface AudioActionContext {
  /** Ordered ids of the list the item belongs to ("play from here"). */
  queueIds?: readonly string[];
  queueLabel?: string;
  collectionId?: string;
  playlistId?: string;
  /** Hides "play" actions when the menu is opened from the player itself. */
  fromPlayer?: boolean;
}

interface AudioActionsState {
  request: { item: AudioLibraryItem; context: AudioActionContext } | null;
  open: (item: AudioLibraryItem, context?: AudioActionContext) => void;
  close: () => void;
}

/**
 * Presentation state for the global audio actions menu. Any feature can
 * open it; a single host (library feature) renders it and runs the actions.
 */
export const useAudioActionsStore = create<AudioActionsState>(set => ({
  request: null,
  open: (item, context = {}) => set({ request: { item, context } }),
  close: () => set({ request: null }),
}));

export function openAudioActions(
  item: AudioLibraryItem,
  context?: AudioActionContext,
): void {
  useAudioActionsStore.getState().open(item, context);
}
