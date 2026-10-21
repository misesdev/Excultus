import type { Clock, EventBus, Logger, NetworkMonitor } from '@core/application';
import { AudioPlaybackError, toAppError, type ErrorCode } from '@core/errors';
import type { Unsubscribe } from '@core/types';
import { isRemotelyPlayable, type Audio, type AudioRepository } from '@features/audios';
import { buildProgress, resumePosition } from '../domain/entities/PlaybackProgress';
import {
  createQueue,
  currentAudioId,
  EMPTY_QUEUE,
  enqueue,
  moveTo,
  nextPosition,
  playNext as insertNext,
  previousPosition,
  removeAudio,
  setShuffle,
  type PlaybackQueue,
  type RandomSource,
  type RepeatMode,
} from '../domain/entities/PlaybackQueue';
import { isTimerExpired, type SleepTimer } from '../domain/entities/SleepTimer';
import type { PlaybackProgressRepository } from '../domain/repositories/PlaybackProgressRepository';
import type {
  AudioPlaybackEngine,
  EngineEvent,
  EngineState,
  LocalFileResolver,
  PlaybackHistoryRecorder,
  PlayerConfig,
  PlayerSessionStore,
  RemoteCommand,
} from './ports';

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'error';

export interface NowPlaying {
  audioId: string;
  title: string;
  subtitle?: string;
  artworkPath?: string;
  isLocal: boolean;
}

export interface PlayerState {
  status: PlayerStatus;
  current?: NowPlaying;
  positionMs: number;
  durationMs: number;
  rate: number;
  repeatMode: RepeatMode;
  queue: PlaybackQueue;
  contextLabel?: string;
  sleepTimer?: SleepTimer;
  errorCode?: ErrorCode;
}

/** Minimal surface required by the spec; the controller implements it. */
export interface AudioPlayerService {
  play(audioId: string): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
}

export interface PlayerControllerDeps {
  engine: AudioPlaybackEngine;
  audios: AudioRepository;
  localFiles: LocalFileResolver;
  progress: PlaybackProgressRepository;
  history: PlaybackHistoryRecorder;
  session: PlayerSessionStore;
  network: NetworkMonitor;
  events: EventBus;
  clock: Clock;
  logger: Logger;
  getConfig: () => PlayerConfig;
  random?: RandomSource;
}

export interface PlayOptions {
  contextLabel?: string;
  /** Overrides the resume policy (e.g. when opening a bookmark). */
  startPositionMs?: number;
}

/** Periodic progress writes while playing; pauses/seeks/track changes save immediately. */
const PROGRESS_SAVE_INTERVAL_MS = 10000;
/** "Previous" restarts the current track when past this position. */
const RESTART_THRESHOLD_MS = 3000;

const ENGINE_STATUS: Partial<Record<EngineState, PlayerStatus>> = {
  loading: 'loading',
  buffering: 'buffering',
  playing: 'playing',
  paused: 'paused',
  ready: 'paused',
  stopped: 'paused',
};

/**
 * Central playback state machine. It owns the queue (domain), drives the
 * native engine through a port, persists progress/history/session, and
 * publishes immutable snapshots to the presentation layer. UI components
 * never talk to the engine directly.
 */
export class PlayerController implements AudioPlayerService {
  private state: PlayerState = {
    status: 'idle',
    positionMs: 0,
    durationMs: 0,
    rate: 1,
    repeatMode: 'off',
    queue: EMPTY_QUEUE,
  };
  private readonly listeners = new Set<(state: PlayerState) => void>();
  private readonly subscriptions: Unsubscribe[] = [];
  private commands: Promise<unknown> = Promise.resolve();
  private loadedAudioId: string | null = null;
  private currentAudio: Audio | null = null;
  private lastSavedAtMs = 0;
  private initialized = false;

  constructor(private readonly deps: PlayerControllerDeps) {}

  // ------------------------------------------------------------ lifecycle

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const config = this.deps.getConfig();
    await this.deps.engine.setup({
      forwardJumpSec: config.skipForwardSec,
      backwardJumpSec: config.skipBackwardSec,
    });
    this.subscriptions.push(
      this.deps.engine.subscribe(event => this.onEngineEvent(event)),
    );
    await this.restoreSession();
  }

  dispose(): void {
    this.subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
    this.initialized = false;
  }

  /** Applies changed settings (jump intervals) to the native controls. */
  async applyConfig(): Promise<void> {
    const config = this.deps.getConfig();
    await this.deps.engine.updateOptions({
      forwardJumpSec: config.skipForwardSec,
      backwardJumpSec: config.skipBackwardSec,
    });
  }

  getState(): PlayerState {
    return this.state;
  }

  subscribe(listener: (state: PlayerState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  // ------------------------------------------------------------ commands

  play(audioId: string): Promise<void> {
    return this.playQueue([audioId], 0);
  }

  playQueue(
    audioIds: readonly string[],
    startIndex = 0,
    options: PlayOptions = {},
  ): Promise<void> {
    return this.serial(async () => {
      const created = createQueue(audioIds, startIndex);
      if (created.items.length === 0) {
        return;
      }
      const shuffled = this.state.queue.shuffled
        ? setShuffle(created, true, this.random)
        : created;
      const start = await this.findPlayablePosition(shuffled);
      if (start === null) {
        throw new AudioPlaybackError('No audio in the queue can play now', {
          details: { count: created.items.length },
          userMessage:
            'Nenhum áudio desta lista pode tocar agora. Baixe os áudios (os do YouTube só tocam baixados) ou conecte-se à internet.',
        });
      }
      await this.saveProgress();
      // A new queue starts at the configured default speed; changes made in
      // the player apply to the current queue (and survive restarts).
      this.setState({
        queue: moveTo(shuffled, start),
        contextLabel: options.contextLabel,
        rate: this.deps.getConfig().defaultSpeed,
      });
      await this.loadCurrent(true, options.startPositionMs);
      await this.persistSession();
    });
  }

  togglePlayPause(): Promise<void> {
    return this.state.status === 'playing' || this.state.status === 'buffering'
      ? this.pause()
      : this.resume();
  }

  resume(): Promise<void> {
    return this.serial(async () => {
      const current = currentAudioId(this.state.queue);
      if (!current) {
        return;
      }
      if (this.loadedAudioId !== current || this.state.status === 'error') {
        await this.loadCurrent(
          true,
          this.state.positionMs > 0 ? this.state.positionMs : undefined,
        );
        return;
      }
      await this.deps.engine.play();
    });
  }

  pause(): Promise<void> {
    return this.serial(async () => {
      if (!this.loadedAudioId) {
        return;
      }
      await this.deps.engine.pause();
      await this.saveProgress(true);
    });
  }

  stop(): Promise<void> {
    return this.serial(async () => {
      await this.saveProgress(true);
      await this.deps.engine.stop();
      this.loadedAudioId = null;
      this.setState({ status: 'paused', sleepTimer: undefined });
    });
  }

  /** Clears the queue and hides the mini player. */
  close(): Promise<void> {
    return this.serial(async () => {
      await this.saveProgress(true);
      await this.deps.engine.stop();
      this.loadedAudioId = null;
      this.currentAudio = null;
      this.setState({
        status: 'idle',
        current: undefined,
        queue: EMPTY_QUEUE,
        positionMs: 0,
        durationMs: 0,
        sleepTimer: undefined,
        contextLabel: undefined,
        errorCode: undefined,
      });
      await this.deps.session.clear();
    });
  }

  seekTo(positionMs: number): Promise<void> {
    return this.serial(async () => {
      const target = this.clampPosition(positionMs);
      this.setState({ positionMs: target });
      if (this.loadedAudioId) {
        await this.deps.engine.seekTo(target);
      }
      await this.saveProgress(true);
    });
  }

  seekBy(deltaMs: number): Promise<void> {
    return this.seekTo(this.state.positionMs + deltaMs);
  }

  skipForward(): Promise<void> {
    return this.seekBy(this.deps.getConfig().skipForwardSec * 1000);
  }

  skipBackward(): Promise<void> {
    return this.seekBy(-this.deps.getConfig().skipBackwardSec * 1000);
  }

  setSpeed(speed: number): Promise<void> {
    return this.serial(async () => {
      this.setState({ rate: speed });
      if (this.loadedAudioId) {
        await this.deps.engine.setRate(speed);
      }
      await this.persistSession();
    });
  }

  skipToNext(): Promise<void> {
    return this.serial(async () => {
      const next = nextPosition(
        this.state.queue,
        this.state.repeatMode === 'one' ? 'all' : this.state.repeatMode,
      );
      if (next === null) {
        return;
      }
      await this.moveAndLoad(next);
    });
  }

  skipToPrevious(): Promise<void> {
    return this.serial(async () => {
      if (this.state.positionMs > RESTART_THRESHOLD_MS && this.loadedAudioId) {
        this.setState({ positionMs: 0 });
        await this.deps.engine.seekTo(0);
        return;
      }
      const previous = previousPosition(
        this.state.queue,
        this.state.repeatMode === 'one' ? 'all' : this.state.repeatMode,
      );
      if (previous === null) {
        this.setState({ positionMs: 0 });
        if (this.loadedAudioId) {
          await this.deps.engine.seekTo(0);
        }
        return;
      }
      await this.moveAndLoad(previous);
    });
  }

  skipToQueuePosition(position: number): Promise<void> {
    return this.serial(() => this.moveAndLoad(position));
  }

  setRepeatMode(mode: RepeatMode): Promise<void> {
    return this.serial(async () => {
      this.setState({ repeatMode: mode });
      await this.deps.engine.setRepeatOne(mode === 'one');
      await this.persistSession();
    });
  }

  cycleRepeatMode(): Promise<void> {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next =
      order[(order.indexOf(this.state.repeatMode) + 1) % order.length] ?? 'off';
    return this.setRepeatMode(next);
  }

  toggleShuffle(): Promise<void> {
    return this.serial(async () => {
      this.setState({
        queue: setShuffle(this.state.queue, !this.state.queue.shuffled, this.random),
      });
      await this.persistSession();
    });
  }

  addToQueue(audioIds: readonly string[]): Promise<void> {
    return this.serial(async () => {
      const wasEmpty = this.state.queue.items.length === 0;
      this.setState({ queue: enqueue(this.state.queue, audioIds) });
      if (wasEmpty) {
        await this.loadCurrent(true);
      }
      await this.persistSession();
    });
  }

  playNext(audioIds: readonly string[]): Promise<void> {
    return this.serial(async () => {
      const wasEmpty = this.state.queue.items.length === 0;
      this.setState({ queue: insertNext(this.state.queue, audioIds) });
      if (wasEmpty) {
        await this.loadCurrent(true);
      }
      await this.persistSession();
    });
  }

  removeFromQueue(audioId: string): Promise<void> {
    return this.serial(async () => {
      this.setState({ queue: removeAudio(this.state.queue, audioId) });
      await this.persistSession();
    });
  }

  setSleepTimer(timer: SleepTimer | null): void {
    this.setState({ sleepTimer: timer ?? undefined });
    this.deps.logger.info('player.sleep_timer', { kind: timer?.kind ?? 'off' });
  }

  /** Called when an audio leaves the library so the queue never references it. */
  forgetAudio(audioId: string): Promise<void> {
    return this.serial(async () => {
      if (currentAudioId(this.state.queue) === audioId) {
        await this.deps.engine.stop();
        this.loadedAudioId = null;
        const remaining = this.state.queue.items.filter(id => id !== audioId);
        this.setState({
          queue: createQueue(remaining),
          current: undefined,
          positionMs: 0,
        });
        if (remaining.length > 0) {
          await this.loadCurrent(false);
        } else {
          this.setState({ status: 'idle' });
        }
      } else {
        this.setState({ queue: removeAudio(this.state.queue, audioId) });
      }
      await this.persistSession();
    });
  }

  // ------------------------------------------------------------ internals

  private get random(): RandomSource {
    return this.deps.random ?? Math.random;
  }

  private async moveAndLoad(position: number): Promise<void> {
    const target = await this.findPlayablePosition(moveTo(this.state.queue, position));
    if (target === null) {
      this.deps.logger.info('player.nothing_playable_ahead', { position });
      return;
    }
    await this.saveProgress(true);
    this.setState({ queue: moveTo(this.state.queue, target) });
    await this.loadCurrent(true);
    await this.persistSession();
  }

  private async restoreSession(): Promise<void> {
    const config = this.deps.getConfig();
    const session = await this.deps.session.load();
    if (!session || session.queue.items.length === 0) {
      this.setState({ rate: config.defaultSpeed });
      return;
    }
    this.setState({
      queue: session.queue,
      repeatMode: session.repeatMode,
      rate: session.rate,
      contextLabel: session.contextLabel,
    });
    const audioId = currentAudioId(session.queue);
    const audio = audioId ? await this.deps.audios.findById(audioId) : null;
    if (!audio) {
      await this.deps.session.clear();
      this.setState({ queue: EMPTY_QUEUE });
      return;
    }
    const saved = await this.deps.progress.find(audio.id);
    const localPath = await this.deps.localFiles.findPlayableLocalPath(audio.id);
    this.currentAudio = audio;
    this.setState({
      status: 'paused',
      current: this.toNowPlaying(audio, localPath !== null),
      positionMs: resumePosition(saved, true),
      durationMs: audio.durationMs ?? saved?.durationMs ?? 0,
    });
  }

  /** Loads the queue's current audio into the engine. */
  private async loadCurrent(autoPlay: boolean, explicitStartMs?: number): Promise<void> {
    const audioId = currentAudioId(this.state.queue);
    if (!audioId) {
      return;
    }
    const config = this.deps.getConfig();
    const audio = await this.deps.audios.findById(audioId);
    if (!audio) {
      this.setState({ queue: removeAudio(this.state.queue, audioId) });
      return;
    }
    this.currentAudio = audio;
    this.lastSavedAtMs = this.deps.clock.nowMs();
    this.setState({
      status: 'loading',
      current: this.toNowPlaying(audio, false),
      errorCode: undefined,
      durationMs: audio.durationMs ?? 0,
    });

    try {
      const url = await this.resolveUrl(audio);
      const saved = await this.deps.progress.find(audio.id);
      const start = explicitStartMs ?? resumePosition(saved, config.autoResume);
      await this.deps.engine.load(
        {
          id: audio.id,
          url,
          title: audio.title,
          artist: audio.artist,
          album: audio.album ?? this.state.contextLabel,
          artworkUri: audio.artworkPath ? `file://${audio.artworkPath}` : undefined,
          durationMs: audio.durationMs,
        },
        start,
      );
      this.loadedAudioId = audio.id;
      await this.deps.engine.setRate(this.state.rate);
      await this.deps.engine.setRepeatOne(this.state.repeatMode === 'one');
      this.setState({
        positionMs: start,
        current: this.toNowPlaying(audio, url.startsWith('file://')),
        durationMs: audio.durationMs ?? saved?.durationMs ?? 0,
        status: autoPlay ? 'loading' : 'paused',
      });
      if (autoPlay) {
        await this.deps.engine.play();
        await this.deps.history.record(audio.id, start, this.deps.clock.nowIso());
        this.deps.events.emit('history');
      }
    } catch (error) {
      const appError = toAppError(error);
      this.loadedAudioId = null;
      this.deps.logger.error(
        'player.load_failed',
        { audioId, code: appError.code },
        error,
      );
      this.setState({ status: 'error', errorCode: appError.code });
    }
  }

  /**
   * First queue position, from the queue's current one onwards (in play
   * order), whose audio can play right now: downloaded, or streamable while
   * online. YouTube audio only plays downloaded. Null when none can.
   */
  private async findPlayablePosition(queue: PlaybackQueue): Promise<number | null> {
    const { isConnected } = await this.deps.network.getStatus();
    let candidate = queue;
    for (let checked = 0; checked < queue.items.length; checked++) {
      const audioId = currentAudioId(candidate);
      const audio = audioId ? await this.deps.audios.findById(audioId) : null;
      if (audio) {
        const local = await this.deps.localFiles.findPlayableLocalPath(audio.id);
        if (local || (isConnected && isRemotelyPlayable(audio))) {
          if (checked > 0) {
            this.deps.logger.info('player.skipped_unplayable', { skipped: checked });
          }
          return candidate.position;
        }
      }
      const next = nextPosition(candidate, 'off');
      if (next === null) {
        return null;
      }
      candidate = moveTo(candidate, next);
    }
    return null;
  }

  private async resolveUrl(audio: Audio): Promise<string> {
    const localPath = await this.deps.localFiles.findPlayableLocalPath(audio.id);
    if (localPath) {
      return `file://${localPath}`;
    }
    if (!isRemotelyPlayable(audio) || !audio.mediaUrl) {
      throw new AudioPlaybackError('Audio has no playable source', {
        details: { audioId: audio.id, sourceType: audio.sourceType },
      });
    }
    const network = await this.deps.network.getStatus();
    if (!network.isConnected) {
      throw new AudioPlaybackError('Offline and audio is not downloaded', {
        details: { audioId: audio.id },
      });
    }
    return audio.mediaUrl;
  }

  private onEngineEvent(event: EngineEvent): void {
    switch (event.type) {
      case 'progress':
        this.onProgress(event.positionMs, event.durationMs);
        return;
      case 'state': {
        const status = ENGINE_STATUS[event.state];
        if (status && this.loadedAudioId) {
          this.setState({ status });
        }
        return;
      }
      case 'ended':
        this.background(() => this.onTrackEnded());
        return;
      case 'error':
        this.deps.logger.error('player.engine_error', {
          code: event.code,
          message: event.message,
        });
        this.setState({ status: 'error', errorCode: 'audio-playback' });
        this.background(() => this.saveProgress(true));
        return;
      case 'remote':
        this.handleRemote(event.command);
        return;
    }
  }

  private handleRemote(command: RemoteCommand): void {
    switch (command.type) {
      case 'play':
        this.background(() => this.resume());
        return;
      case 'pause':
        this.background(() => this.pause());
        return;
      case 'stop':
        this.background(() => this.stop());
        return;
      case 'next':
        this.background(() => this.skipToNext());
        return;
      case 'previous':
        this.background(() => this.skipToPrevious());
        return;
      case 'seek':
        this.background(() => this.seekTo(command.positionMs));
        return;
      case 'jump-forward':
        this.background(() => this.skipForward());
        return;
      case 'jump-backward':
        this.background(() => this.skipBackward());
        return;
    }
  }

  private onProgress(positionMs: number, durationMs: number): void {
    if (!this.loadedAudioId) {
      return;
    }
    const audio = this.currentAudio;
    if (audio && durationMs > 0 && !audio.durationMs) {
      // Local/direct files often have no duration until the engine reads them.
      this.currentAudio = { ...audio, durationMs };
      this.deps.audios
        .updateDuration(audio.id, durationMs, this.deps.clock.nowIso())
        .catch(error =>
          this.deps.logger.warn(
            'player.duration_update_failed',
            { audioId: audio.id },
            error,
          ),
        );
    }
    this.setState({
      positionMs,
      durationMs: durationMs > 0 ? durationMs : this.state.durationMs,
    });

    const nowMs = this.deps.clock.nowMs();
    if (isTimerExpired(this.state.sleepTimer, nowMs)) {
      this.setState({ sleepTimer: undefined });
      this.background(() => this.pause());
      return;
    }
    if (nowMs - this.lastSavedAtMs >= PROGRESS_SAVE_INTERVAL_MS) {
      this.background(() => this.saveProgress());
    }
  }

  private async onTrackEnded(): Promise<void> {
    await this.serial(async () => {
      this.setState({ positionMs: this.state.durationMs });
      await this.saveProgress(true, true);
      if (this.state.sleepTimer?.kind === 'end-of-track') {
        this.setState({ sleepTimer: undefined, status: 'paused' });
        return;
      }
      if (this.state.repeatMode === 'one' && this.loadedAudioId) {
        await this.deps.engine.seekTo(0);
        await this.deps.engine.play();
        return;
      }
      const next = nextPosition(this.state.queue, this.state.repeatMode);
      const target =
        next === null || !this.deps.getConfig().autoPlayNext
          ? null
          : await this.findPlayablePosition(moveTo(this.state.queue, next));
      if (target === null) {
        this.setState({ status: 'paused' });
        return;
      }
      this.setState({ queue: moveTo(this.state.queue, target) });
      await this.loadCurrent(true);
      await this.persistSession();
    });
  }

  private async saveProgress(notify = false, reachedEnd = false): Promise<void> {
    const audioId = this.loadedAudioId;
    if (!audioId) {
      return;
    }
    this.lastSavedAtMs = this.deps.clock.nowMs();
    const progress = buildProgress({
      audioId,
      positionMs: this.state.positionMs,
      durationMs: this.state.durationMs || this.currentAudio?.durationMs,
      threshold: this.deps.getConfig().completionThreshold,
      nowIso: this.deps.clock.nowIso(),
      reachedEnd,
    });
    try {
      await this.deps.progress.save(progress);
      if (notify) {
        this.deps.events.emit('history', 'library');
      }
    } catch (error) {
      this.deps.logger.error('player.progress_save_failed', { audioId }, error);
    }
  }

  private async persistSession(): Promise<void> {
    try {
      await this.deps.session.save({
        queue: this.state.queue,
        repeatMode: this.state.repeatMode,
        rate: this.state.rate,
        contextLabel: this.state.contextLabel,
      });
    } catch (error) {
      this.deps.logger.warn('player.session_save_failed', {}, error);
    }
  }

  private toNowPlaying(audio: Audio, isLocal: boolean): NowPlaying {
    return {
      audioId: audio.id,
      title: audio.title,
      subtitle: audio.artist ?? audio.album ?? this.state.contextLabel,
      artworkPath: audio.artworkPath,
      isLocal,
    };
  }

  private clampPosition(positionMs: number): number {
    const max =
      this.state.durationMs > 0 ? this.state.durationMs : Number.MAX_SAFE_INTEGER;
    return Math.min(max, Math.max(0, Math.round(positionMs)));
  }

  private setState(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener(this.state));
  }

  /** Fire-and-forget for event-driven commands; failures are logged by `serial`. */
  private background(task: () => Promise<void>): void {
    task().catch(() => undefined);
  }

  /** Serializes commands so rapid taps never interleave engine calls. */
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.commands.then(task, task);
    this.commands = result.catch(error => {
      this.deps.logger.error('player.command_failed', {}, error);
    });
    return result;
  }
}
