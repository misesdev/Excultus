import { optionalText } from '@core/domain/validation';
import { ValidationError } from '@core/errors';
import { normalizeWhitespace } from '@core/utils';
import type { Audio } from '@features/audios';

export interface AudioBookmark {
  id: string;
  audioId: string;
  positionMs: number;
  title?: string;
  note?: string;
  createdAt: string;
}

export interface BookmarkInput {
  audioId: string;
  positionMs: number;
  title?: string;
  note?: string;
}

export const BOOKMARK_TITLE_MAX_LENGTH = 120;
export const BOOKMARK_NOTE_MAX_LENGTH = 2000;

export function createBookmark(
  input: BookmarkInput,
  id: string,
  nowIso: string,
): AudioBookmark {
  if (!Number.isFinite(input.positionMs) || input.positionMs < 0) {
    throw new ValidationError('Bookmark position must be positive', 'positionMs');
  }
  const title = optionalText(
    input.title === undefined ? undefined : normalizeWhitespace(input.title),
    'title',
    BOOKMARK_TITLE_MAX_LENGTH,
  );
  const note = optionalText(input.note, 'note', BOOKMARK_NOTE_MAX_LENGTH);
  return {
    id,
    audioId: input.audioId,
    positionMs: Math.round(input.positionMs),
    title,
    note,
    createdAt: nowIso,
  };
}

export interface BookmarkWithAudio {
  bookmark: AudioBookmark;
  audio: Audio;
}

export interface BookmarkRepository {
  insert(bookmark: AudioBookmark): Promise<void>;
  update(bookmark: AudioBookmark): Promise<void>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AudioBookmark | null>;
  listForAudio(audioId: string): Promise<AudioBookmark[]>;
  listAll(): Promise<BookmarkWithAudio[]>;
}
