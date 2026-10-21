import type { Clock, EventBus, IdGenerator } from '@core/application';
import { NotFoundError } from '@core/errors';
import {
  createBookmark,
  type AudioBookmark,
  type BookmarkInput,
  type BookmarkRepository,
  type BookmarkWithAudio,
} from '../domain/AudioBookmark';

export interface BookmarkUseCaseDeps {
  bookmarks: BookmarkRepository;
  events: EventBus;
  clock: Clock;
  generateId: IdGenerator;
}

export function createBookmarkUseCases({
  bookmarks,
  events,
  clock,
  generateId,
}: BookmarkUseCaseDeps) {
  return {
    async add(input: BookmarkInput): Promise<AudioBookmark> {
      const bookmark = createBookmark(input, generateId(), clock.nowIso());
      await bookmarks.insert(bookmark);
      events.emit('bookmarks');
      return bookmark;
    },

    async edit(
      id: string,
      changes: Pick<BookmarkInput, 'title' | 'note'>,
    ): Promise<AudioBookmark> {
      const current = await bookmarks.findById(id);
      if (!current) {
        throw new NotFoundError('Bookmark', id);
      }
      const updated = createBookmark(
        { audioId: current.audioId, positionMs: current.positionMs, ...changes },
        current.id,
        current.createdAt,
      );
      await bookmarks.update(updated);
      events.emit('bookmarks');
      return updated;
    },

    async remove(id: string): Promise<void> {
      await bookmarks.delete(id);
      events.emit('bookmarks');
    },

    listForAudio(audioId: string): Promise<AudioBookmark[]> {
      return bookmarks.listForAudio(audioId);
    },

    listAll(): Promise<BookmarkWithAudio[]> {
      return bookmarks.listAll();
    },
  };
}

export type BookmarkUseCases = ReturnType<typeof createBookmarkUseCases>;
