import type { Clock, EventBus } from '@core/application';
import type { AudioRepository } from '@features/audios';
import type { PlaybackProgressRepository } from '../domain/repositories/PlaybackProgressRepository';

export interface ProgressUseCaseDeps {
  progress: PlaybackProgressRepository;
  audios: AudioRepository;
  events: EventBus;
  clock: Clock;
}

export function createProgressUseCases({
  progress,
  audios,
  events,
  clock,
}: ProgressUseCaseDeps) {
  return {
    async markCompleted(audioId: string): Promise<void> {
      const audio = await audios.findById(audioId);
      const durationMs = audio?.durationMs;
      await progress.save({
        audioId,
        positionMs: durationMs ?? 0,
        durationMs,
        completed: true,
        lastPlayedAt: clock.nowIso(),
      });
      events.emit('library', 'history', 'collections');
    },

    async resetProgress(audioId: string): Promise<void> {
      await progress.delete(audioId);
      events.emit('library', 'history', 'collections');
    },
  };
}

export type ProgressUseCases = ReturnType<typeof createProgressUseCases>;
