import { create } from 'zustand';
import type { Unsubscribe } from '@core/types';
import { EMPTY_QUEUE, type PlayerController, type PlayerState } from '../../index';

const INITIAL_STATE: PlayerState = {
  status: 'idle',
  positionMs: 0,
  durationMs: 0,
  rate: 1,
  repeatMode: 'off',
  queue: EMPTY_QUEUE,
};

/**
 * Read-only projection of the PlayerController state for React components.
 * The controller is the single source of truth; components select narrow
 * slices to avoid re-rendering on every progress tick.
 */
export const usePlayerStore = create<PlayerState>(() => INITIAL_STATE);

export function bindPlayerStore(controller: PlayerController): Unsubscribe {
  return controller.subscribe(state => usePlayerStore.setState(state, true));
}

export function useIsActivePlayer(): boolean {
  return usePlayerStore(state => state.current !== undefined);
}

/** "playing"/"paused" for the current audio, null for any other. */
export function useNowPlayingState(audioId: string): 'playing' | 'paused' | null {
  return usePlayerStore(state => {
    if (state.current?.audioId !== audioId) {
      return null;
    }
    return state.status === 'playing' ||
      state.status === 'buffering' ||
      state.status === 'loading'
      ? 'playing'
      : 'paused';
  });
}

export function useIsPlaying(): boolean {
  return usePlayerStore(
    state =>
      state.status === 'playing' ||
      state.status === 'buffering' ||
      state.status === 'loading',
  );
}
