/**
 * @jest-environment node
 */
import { buildAudio, buildCollection } from '@test/support/builders';
import { createTestDatabase } from '@test/support/testDatabase';
import { SqliteAudioRepository } from '../repositories/SqliteAudioRepository';
import { SqliteCollectionRepository } from '../repositories/SqliteCollectionRepository';
import { SqliteLibrarySearchRepository } from '../repositories/SqliteLibrarySearchRepository';

const LIBRARY_SIZE = 1500;
/** Generous bound for CI machines; on-device queries run on a native thread. */
const MAX_QUERY_MS = 400;

async function timed<T>(work: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await work();
  return { result, ms: Date.now() - start };
}

describe('large library (performance)', () => {
  it(`stays fast with ${LIBRARY_SIZE} audios`, async () => {
    const db = await createTestDatabase();
    const ids = Array.from(
      { length: LIBRARY_SIZE },
      (_, index) => `a${String(index).padStart(4, '0')}`,
    );
    await db.transaction(async tx => {
      const audios = new SqliteAudioRepository(tx);
      for (const [index, id] of ids.entries()) {
        await audios.save(
          buildAudio(id, {
            title: `Aula ${index} sobre ${index % 2 ? 'lógica' : 'metafísica'}`,
          }),
        );
      }
    });
    const collections = new SqliteCollectionRepository(db);
    await collections.insert(buildCollection('c1'));
    expect(await collections.addAudios('c1', ids, 'now')).toBe(LIBRARY_SIZE);

    const search = new SqliteLibrarySearchRepository(db);
    const page = await timed(() =>
      search.search(
        { text: 'logica', filter: 'all', sort: 'title' },
        { limit: 40, offset: 0 },
      ),
    );
    expect(page.result).toHaveLength(40);
    expect(page.ms).toBeLessThan(MAX_QUERY_MS);

    const deepPage = await timed(() =>
      search.search({ filter: 'all', sort: 'addedAt' }, { limit: 40, offset: 1400 }),
    );
    expect(deepPage.result).toHaveLength(40);
    expect(deepPage.ms).toBeLessThan(MAX_QUERY_MS);

    const summary = await timed(() => collections.findSummary('c1'));
    expect(summary.result?.audioCount).toBe(LIBRARY_SIZE);
    expect(summary.ms).toBeLessThan(MAX_QUERY_MS);

    const items = await timed(() => collections.listItems('c1', { sort: 'custom' }));
    expect(items.result).toHaveLength(LIBRARY_SIZE);
    expect(items.ms).toBeLessThan(MAX_QUERY_MS * 2);
  });
});
