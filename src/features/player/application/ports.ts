import type { Unsubscribe } from '@core/types';
import type { PlaybackQueue, RepeatMode } from '../domain/entities/PlaybackQueue';

export interface EngineTrack {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  artworkUri?: string;
  durationMs?: number;
}

export type EngineState =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped';

export type RemoteCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'seek'; positionMs: number }
  | { type: 'jump-forward' }
  | { type: 'jump-backward' };

export type EngineEvent =
  | { type: 'state'; state: EngineState }
  | { type: 'progress'; positionMs: number; durationMs: number }
  | { type: 'ended' }
  | { type: 'error'; message: string; code?: string }
  | { type: 'remote'; command: RemoteCommand };

export interface EngineOptions {
  forwardJumpSec: number;
  backwardJumpSec: number;
}

/**
 * Port over the native playback engine (React Native Track Player). The
 * engine plays exactly one track at a time; queue semantics live in the
 * domain so there is a single source of truth.
 */
export interface AudioPlaybackEngine {
  setup(options: EngineOptions): Promise<void>;
  updateOptions(options: EngineOptions): Promise<void>;
  load(track: EngineTrack, startPositionMs: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  setRepeatOne(enabled: boolean): Promise<void>;
  getProgress(): Promise<{ positionMs: number; durationMs: number }>;
  subscribe(listener: (event: EngineEvent) => void): Unsubscribe;
}

/** Resolves a verified local file for an audio (implemented by downloads). */
export interface LocalFileResolver {
  findPlayableLocalPath(audioId: string): Promise<string | null>;
}

export interface PlaybackHistoryRecorder {
  record(audioId: string, positionMs: number, nowIso: string): Promise<void>;
}

export interface PlayerSession {
  queue: PlaybackQueue;
  repeatMode: RepeatMode;
  rate: number;
  contextLabel?: string;
}

/** Persists the active queue so playback can be resumed after a restart. */
export interface PlayerSessionStore {
  load(): Promise<PlayerSession | null>;
  save(session: PlayerSession): Promise<void>;
  clear(): Promise<void>;
}

export interface PlayerConfig {
  defaultSpeed: number;
  skipForwardSec: number;
  skipBackwardSec: number;
  autoPlayNext: boolean;
  completionThreshold: number;
  autoResume: boolean;
}
