import type { EventBus } from '@core/application';
import type { Page, PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';
import type { HistoryListEntry, HistoryRepository } from '../domain/HistoryRepository';

export function createHistoryUseCases({
  history,
  events,
}: {
  history: HistoryRepository;
  events: EventBus;
}) {
  return {
    continueListening(limit = 10): Promise<AudioLibraryItem[]> {
      return history.listInProgress(limit);
    },

    async recent(page: PageRequest): Promise<Page<HistoryListEntry>> {
      const items = await history.listRecent({
        limit: page.limit + 1,
        offset: page.offset,
      });
      return { items: items.slice(0, page.limit), hasMore: items.length > page.limit };
    },

    /** Clears the play log; saved positions are kept so "continue listening" still works. */
    async clear(): Promise<void> {
      await history.clear();
      events.emit('history');
    },
  };
}

export type HistoryUseCases = ReturnType<typeof createHistoryUseCases>;
