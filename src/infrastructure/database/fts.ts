import { toSearchTerms } from '@features/search';

/**
 * Builds an FTS5 MATCH expression where every term is a quoted prefix query
 * ("aula"* "filo"*), implicitly AND-ed. Returns null when there is nothing
 * to search for.
 */
export function buildFtsMatch(text: string | undefined): string | null {
  const terms = toSearchTerms(text);
  if (terms.length === 0) {
    return null;
  }
  return terms.map(term => `"${term.replace(/"/g, '""')}"*`).join(' ');
}

/** Escapes LIKE wildcards for literal matching with ESCAPE '\'. */
export function likePattern(text: string): string {
  return `%${text.trim().replace(/[\\%_]/g, match => `\\${match}`)}%`;
}
