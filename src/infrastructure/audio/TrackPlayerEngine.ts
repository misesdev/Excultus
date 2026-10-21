import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import type { Logger } from '@core/application';
import type { Unsubscribe } from '@core/types';
import type {
  AudioPlaybackEngine,
  EngineEvent,
  EngineOptions,
  EngineState,
  EngineTrack,
} from '@features/player';
import { remoteCommands } from './remoteCommands';

const MS_PER_SECOND = 1000;
const PROGRESS_INTERVAL_SECONDS = 1;

const STATE_MAP: Partial<Record<State, EngineState>> = {
  [State.None]: 'idle',
  [State.Ready]: 'ready',
  [State.Playing]: 'playing',
  [State.Paused]: 'paused',
  [State.Stopped]: 'stopped',
  [State.Loading]: 'loading',
  [State.Buffering]: 'buffering',
};

const CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.SeekTo,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.JumpForward,
  Capability.JumpBackward,
];

/**
 * Adapter that encapsulates React Native Track Player (ExoPlayer/Media3 on
 * Android): background playback, media notification, lock-screen and
 * headset controls, audio focus (calls/other apps) and "becoming noisy"
 * (headphones unplugged) handling.
 */
export class TrackPlayerEngine implements AudioPlaybackEngine {
  private readonly listeners = new Set<(event: EngineEvent) => void>();
  private nativeSubscriptions: Array<{ remove: () => void }> = [];
  private remoteSubscription: Unsubscribe | null = null;

  constructor(private readonly logger: Logger) {}

  async setup(options: EngineOptions): Promise<void> {
    try {
      await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
    } catch (error) {
      // Fast Refresh/JS reloads keep the native player alive; anything else is fatal.
      if (!String(error).includes('already been initialized')) {
        throw error;
      }
    }
    await this.updateOptions(options);
    this.attachListeners();
  }

  async updateOptions(options: EngineOptions): Promise<void> {
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: CAPABILITIES,
      notificationCapabilities: CAPABILITIES,
      compactCapabilities: [
        Capability.JumpBackward,
        Capability.Play,
        Capability.Pause,
        Capability.JumpForward,
      ],
      forwardJumpInterval: options.forwardJumpSec,
      backwardJumpInterval: options.backwardJumpSec,
      progressUpdateEventInterval: PROGRESS_INTERVAL_SECONDS,
    });
  }

  async load(track: EngineTrack, startPositionMs: number): Promise<void> {
    await TrackPlayer.load({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artworkUri,
      duration: track.durationMs ? track.durationMs / MS_PER_SECOND : undefined,
    });
    if (startPositionMs > 0) {
      await TrackPlayer.seekTo(startPositionMs / MS_PER_SECOND);
    }
  }

  play(): Promise<void> {
    return TrackPlayer.play();
  }

  pause(): Promise<void> {
    return TrackPlayer.pause();
  }

  stop(): Promise<void> {
    return TrackPlayer.stop();
  }

  seekTo(positionMs: number): Promise<void> {
    return TrackPlayer.seekTo(positionMs / MS_PER_SECOND);
  }

  setRate(rate: number): Promise<void> {
    return TrackPlayer.setRate(rate);
  }

  async setRepeatOne(enabled: boolean): Promise<void> {
    await TrackPlayer.setRepeatMode(enabled ? RepeatMode.Track : RepeatMode.Off);
  }

  async getProgress(): Promise<{ positionMs: number; durationMs: number }> {
    const progress = await TrackPlayer.getProgress();
    return {
      positionMs: progress.position * MS_PER_SECOND,
      durationMs: progress.duration * MS_PER_SECOND,
    };
  }

  subscribe(listener: (event: EngineEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private attachListeners(): void {
    this.nativeSubscriptions.forEach(subscription => subscription.remove());
    this.remoteSubscription?.();
    this.nativeSubscriptions = [
      TrackPlayer.addEventListener(Event.PlaybackState, event => {
        const state = STATE_MAP[event.state];
        if (state) {
          this.emit({ type: 'state', state });
        }
      }),
      TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, event =>
        this.emit({
          type: 'progress',
          positionMs: event.position * MS_PER_SECOND,
          durationMs: event.duration * MS_PER_SECOND,
        }),
      ),
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () =>
        this.emit({ type: 'ended' }),
      ),
      TrackPlayer.addEventListener(Event.PlaybackError, event => {
        this.logger.error('engine.playback_error', { code: event.code });
        this.emit({ type: 'error', message: event.message, code: event.code });
      }),
    ];
    this.remoteSubscription = remoteCommands.subscribe(command =>
      this.emit({ type: 'remote', command }),
    );
  }

  private emit(event: EngineEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}
