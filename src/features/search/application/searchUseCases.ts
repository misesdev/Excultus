import type { Page, PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';
import type { LibraryQuery, LibrarySearchRepository } from '../domain/LibraryQuery';

export function createSearchUseCases({ search }: { search: LibrarySearchRepository }) {
  return {
    /** Paginated search; fetches one extra row to know whether more pages exist. */
    async search(
      query: LibraryQuery,
      page: PageRequest,
    ): Promise<Page<AudioLibraryItem>> {
      const rows = await search.search(query, {
        limit: page.limit + 1,
        offset: page.offset,
      });
      return { items: rows.slice(0, page.limit), hasMore: rows.length > page.limit };
    },

    recentlyAdded(limit: number): Promise<AudioLibraryItem[]> {
      return search.search({ filter: 'all', sort: 'addedAt' }, { limit, offset: 0 });
    },
  };
}

export type SearchUseCases = ReturnType<typeof createSearchUseCases>;
