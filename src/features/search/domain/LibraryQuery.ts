import type { PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';

export const LIBRARY_FILTERS = [
  'all',
  'downloaded',
  'not-downloaded',
  'favorites',
  'in-progress',
  'completed',
] as const;
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

export const LIBRARY_SORTS = ['title', 'addedAt', 'lastPlayed', 'duration'] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export interface LibraryQuery {
  text?: string;
  filter: LibraryFilter;
  sort: LibrarySort;
}

export interface LibrarySearchRepository {
  search(query: LibraryQuery, page: PageRequest): Promise<AudioLibraryItem[]>;
}

const MAX_QUERY_TERMS = 8;
const MIN_TERM_LENGTH = 1;

/** Whitespace, punctuation and every FTS5 operator character. */
const TERM_SEPARATORS = /[\s"'`()*:^+\-.,;!?/\\[\]{}<>|&=~@#$%]+/;

/**
 * Turns free text into safe search terms: punctuation and FTS operators are
 * stripped so user input can never break the query syntax. Accent folding is
 * delegated to the SQLite tokenizer (unicode61 remove_diacritics).
 */
export function toSearchTerms(text: string | undefined): string[] {
  if (!text) {
    return [];
  }
  return text
    .toLowerCase()
    .split(TERM_SEPARATORS)
    .filter(term => term.length >= MIN_TERM_LENGTH)
    .slice(0, MAX_QUERY_TERMS);
}
