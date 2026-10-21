import type { PlaybackProgress } from '../entities/PlaybackProgress';

export interface PlaybackProgressRepository {
  find(audioId: string): Promise<PlaybackProgress | null>;
  save(progress: PlaybackProgress): Promise<void>;
  delete(audioId: string): Promise<void>;
}
