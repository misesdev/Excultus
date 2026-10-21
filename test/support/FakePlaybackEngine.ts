import type { Unsubscribe } from '@core/types';
import type {
  AudioPlaybackEngine,
  EngineEvent,
  EngineOptions,
  EngineTrack,
} from '@features/player';

/** Scriptable engine: records commands and lets tests emit native events. */
export class FakePlaybackEngine implements AudioPlaybackEngine {
  loaded: { track: EngineTrack; startPositionMs: number } | null = null;
  playing = false;
  rate = 1;
  repeatOne = false;
  options: EngineOptions | null = null;
  readonly seeks: number[] = [];
  private listeners = new Set<(event: EngineEvent) => void>();

  async setup(options: EngineOptions) {
    this.options = options;
  }
  async updateOptions(options: EngineOptions) {
    this.options = options;
  }
  async load(track: EngineTrack, startPositionMs: number) {
    this.loaded = { track, startPositionMs };
    this.playing = false;
  }
  async play() {
    this.playing = true;
    this.emit({ type: 'state', state: 'playing' });
  }
  async pause() {
    this.playing = false;
    this.emit({ type: 'state', state: 'paused' });
  }
  async stop() {
    this.playing = false;
  }
  async seekTo(positionMs: number) {
    this.seeks.push(positionMs);
  }
  async setRate(rate: number) {
    this.rate = rate;
  }
  async setRepeatOne(enabled: boolean) {
    this.repeatOne = enabled;
  }
  async getProgress() {
    return { positionMs: 0, durationMs: 0 };
  }
  subscribe(listener: (event: EngineEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: EngineEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}
