/**
 * @jest-environment node
 */
import { buildAudio, buildCollection } from '@test/support/builders';
import { createTestDatabase } from '@test/support/testDatabase';
import type { SqlDatabase } from '../SqlDatabase';
import {
  SqliteAudioRepository,
  SqliteFavoriteRepository,
} from '../repositories/SqliteAudioRepository';
import { SqliteCollectionRepository } from '../repositories/SqliteCollectionRepository';
import { SqliteDownloadRepository } from '../repositories/SqliteDownloadRepository';
import { SqliteLibrarySearchRepository } from '../repositories/SqliteLibrarySearchRepository';
import {
  SqliteHistoryRepository,
  SqlitePlaybackProgressRepository,
} from '../repositories/SqlitePlaybackRepositories';
import { SqlitePlaylistRepository } from '../repositories/SqlitePlaylistRepository';
import type { Download } from '@features/downloads';

const NOW = '2026-01-01T10:00:00.000Z';

function completedDownload(audioId: string): Download {
  return {
    id: `dl-${audioId}`,
    audioId,
    url: `https://example.org/${audioId}.mp3`,
    status: 'completed',
    bytesDownloaded: 100,
    totalBytes: 100,
    fileExtension: 'mp3',
    tempPath: `/tmp/${audioId}.part`,
    localPath: `/app/audio/${audioId}.mp3`,
    attempts: 0,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
    verifiedAt: NOW,
  };
}

describe('SQLite repositories', () => {
  let db: SqlDatabase;
  let audios: SqliteAudioRepository;
  let collections: SqliteCollectionRepository;

  beforeEach(async () => {
    db = await createTestDatabase();
    audios = new SqliteAudioRepository(db);
    collections = new SqliteCollectionRepository(db);
  });

  describe('audios', () => {
    it('upserts without breaking relations (no REPLACE cascade)', async () => {
      const audio = buildAudio('a1');
      await audios.save(audio);
      await collections.insert(buildCollection('c1'));
      await collections.addAudios('c1', ['a1'], NOW);

      await audios.save({
        ...audio,
        title: 'Novo título',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });

      expect((await audios.findById('a1'))?.title).toBe('Novo título');
      expect(await collections.listAudioIds('c1', 'custom')).toEqual(['a1']);
    });

    it('enforces source uniqueness for deduplication', async () => {
      await audios.save(buildAudio('a1'));
      await expect(
        audios.save({ ...buildAudio('a2'), sourceId: 'item/a1.mp3' }),
      ).rejects.toMatchObject({
        code: 'database',
      });
      expect((await audios.findBySource('archive', 'item/a1.mp3'))?.id).toBe('a1');
    });

    it('only fills a missing duration', async () => {
      await audios.save(buildAudio('a1', { durationMs: undefined }));
      await audios.updateDuration('a1', 1234.4, NOW);
      await audios.updateDuration('a1', 9999, NOW);
      expect((await audios.findById('a1'))?.durationMs).toBe(1234);
    });

    it('builds library items with offline, progress and favorite state', async () => {
      await audios.save(buildAudio('a1'));
      await new SqliteDownloadRepository(db).save(completedDownload('a1'));
      await new SqlitePlaybackProgressRepository(db).save({
        audioId: 'a1',
        positionMs: 30000,
        durationMs: 60000,
        completed: false,
        lastPlayedAt: NOW,
      });
      await new SqliteFavoriteRepository(db).setFavorite('a1', true, NOW);

      const item = await audios.findLibraryItem('a1');
      expect(item).toMatchObject({
        offline: 'available',
        localPath: '/app/audio/a1.mp3',
        isFavorite: true,
        progress: { positionMs: 30000, completed: false },
      });
    });

    it('returns library items in the requested order', async () => {
      await audios.save(buildAudio('a1'));
      await audios.save(buildAudio('a2'));
      const items = await audios.findLibraryItems(['a2', 'missing', 'a1']);
      expect(items.map(item => item.audio.id)).toEqual(['a2', 'a1']);
    });

    it('cascades deletion to every dependent table', async () => {
      await audios.save(buildAudio('a1'));
      await collections.insert(buildCollection('c1'));
      await collections.addAudios('c1', ['a1'], NOW);
      await new SqliteDownloadRepository(db).save(completedDownload('a1'));
      await new SqliteFavoriteRepository(db).setFavorite('a1', true, NOW);
      await new SqliteHistoryRepository(db).record('a1', 0, NOW);

      await audios.delete('a1');

      for (const table of [
        'collection_audios',
        'downloads',
        'favorites',
        'playback_history',
        'audios_fts',
      ]) {
        const { rows } = await db.execute(`SELECT COUNT(*) AS total FROM ${table}`);
        expect(rows[0]?.total).toBe(0);
      }
    });
  });

  describe('collections', () => {
    beforeEach(async () => {
      for (const id of ['a1', 'a2', 'a3']) {
        await audios.save(buildAudio(id, { durationMs: 60000 }));
      }
      await collections.insert(buildCollection('c1'));
    });

    it('appends members once, keeping a contiguous custom order', async () => {
      expect(await collections.addAudios('c1', ['a2', 'a1', 'a2'], NOW)).toBe(2);
      expect(await collections.addAudios('c1', ['a1', 'a3'], NOW)).toBe(1);
      expect(await collections.listAudioIds('c1', 'custom')).toEqual(['a2', 'a1', 'a3']);
    });

    it('reorders members and validates the full set', async () => {
      await collections.addAudios('c1', ['a1', 'a2', 'a3'], NOW);
      await collections.setOrder('c1', ['a3', 'a1', 'a2']);
      expect(await collections.listAudioIds('c1', 'custom')).toEqual(['a3', 'a1', 'a2']);
      await expect(collections.setOrder('c1', ['a3', 'a1'])).rejects.toMatchObject({
        code: 'validation',
      });
      expect(await collections.listAudioIds('c1', 'custom')).toEqual(['a3', 'a1', 'a2']);
    });

    it('computes summary statistics', async () => {
      await collections.addAudios('c1', ['a1', 'a2', 'a3'], NOW);
      await new SqliteDownloadRepository(db).save(completedDownload('a1'));
      const progress = new SqlitePlaybackProgressRepository(db);
      await progress.save({
        audioId: 'a1',
        positionMs: 60000,
        durationMs: 60000,
        completed: true,
        lastPlayedAt: NOW,
      });
      await progress.save({
        audioId: 'a2',
        positionMs: 30000,
        durationMs: 60000,
        completed: false,
        lastPlayedAt: NOW,
      });

      const summary = await collections.findSummary('c1');
      expect(summary).toMatchObject({
        audioCount: 3,
        totalDurationMs: 180000,
        offlineCount: 1,
        listenedMs: 90000,
      });
    });

    it('finds audios exclusive to a collection', async () => {
      await collections.insert(buildCollection('c2'));
      await collections.addAudios('c1', ['a1', 'a2', 'a3'], NOW);
      await collections.addAudios('c2', ['a2'], NOW);
      const playlists = new SqlitePlaylistRepository(db);
      await playlists.insert({ id: 'p1', name: 'Lista', createdAt: NOW, updatedAt: NOW });
      await playlists.addAudios('p1', ['a3'], NOW);

      expect(await collections.findExclusiveAudioIds('c1')).toEqual(['a1']);
    });

    it('filters items inside the collection by text (accent-insensitive)', async () => {
      await audios.save(buildAudio('a4', { title: 'Introdução à Filosofia' }));
      await collections.addAudios('c1', ['a1', 'a4'], NOW);
      const items = await collections.listItems('c1', {
        sort: 'custom',
        text: 'introducao filo',
      });
      expect(items.map(item => item.audio.id)).toEqual(['a4']);
    });

    it('deleting a collection keeps the audios in the library', async () => {
      await collections.addAudios('c1', ['a1'], NOW);
      await collections.delete('c1');
      expect(await audios.findById('a1')).not.toBeNull();
    });
  });

  describe('library search', () => {
    beforeEach(async () => {
      await audios.save(
        buildAudio('a1', { title: 'Aula sobre Aristóteles', artist: 'Prof. X' }),
      );
      await audios.save(
        buildAudio('a2', { title: 'Podcast de música', sourceType: 'direct' }),
      );
      await audios.save(buildAudio('a3', { title: 'Lição de lógica', durationMs: 1000 }));
      await collections.insert(buildCollection('c1', 'Curso de Filosofia'));
      await collections.addAudios('c1', ['a3'], NOW);
    });

    const search = (
      text: string | undefined,
      filter: 'all' | 'favorites' | 'downloaded' = 'all',
    ) =>
      new SqliteLibrarySearchRepository(db)
        .search({ text, filter, sort: 'title' }, { limit: 50, offset: 0 })
        .then(items => items.map(item => item.audio.id));

    it('matches title prefixes without accents', async () => {
      expect(await search('aristot')).toEqual(['a1']);
    });

    it('matches artist, collection name and origin', async () => {
      expect(await search('prof')).toEqual(['a1']);
      expect(await search('filosofia')).toEqual(['a3']);
      expect(await search('direct')).toEqual(['a2']);
    });

    it('ignores FTS operators in user input', async () => {
      await expect(search('"aula* (')).resolves.toEqual(['a1']);
      // Operators become literal terms (AND-ed), so this matches nothing instead of failing.
      await expect(search('aula OR NEAR(')).resolves.toEqual([]);
    });

    it('applies filters and pagination', async () => {
      await new SqliteFavoriteRepository(db).setFavorite('a2', true, NOW);
      expect(await search(undefined, 'favorites')).toEqual(['a2']);
      const page = await new SqliteLibrarySearchRepository(db).search(
        { filter: 'all', sort: 'title' },
        { limit: 2, offset: 1 },
      );
      expect(page.map(item => item.audio.id)).toEqual(['a3', 'a2']);
    });
  });

  describe('history', () => {
    it('collapses consecutive plays of the same audio', async () => {
      await audios.save(buildAudio('a1'));
      await audios.save(buildAudio('a2'));
      const history = new SqliteHistoryRepository(db);
      await history.record('a1', 0, '2026-01-01T10:00:00.000Z');
      await history.record('a1', 5000, '2026-01-01T10:05:00.000Z');
      await history.record('a2', 0, '2026-01-01T10:06:00.000Z');
      await history.record('a1', 0, '2026-01-01T10:07:00.000Z');

      const entries = await history.listRecent({ limit: 10, offset: 0 });
      expect(entries.map(entry => entry.entry.audioId)).toEqual(['a1', 'a2', 'a1']);
    });

    it('lists in-progress audios by last played', async () => {
      await audios.save(buildAudio('a1'));
      await audios.save(buildAudio('a2'));
      const progress = new SqlitePlaybackProgressRepository(db);
      await progress.save({
        audioId: 'a1',
        positionMs: 10000,
        completed: false,
        lastPlayedAt: '2026-01-01T09:00:00.000Z',
      });
      await progress.save({
        audioId: 'a2',
        positionMs: 10000,
        completed: false,
        lastPlayedAt: '2026-01-01T11:00:00.000Z',
      });
      const items = await new SqliteHistoryRepository(db).listInProgress(10);
      expect(items.map(item => item.audio.id)).toEqual(['a2', 'a1']);
    });
  });

  describe('transactions', () => {
    it('rolls back every statement when the unit of work fails', async () => {
      await expect(
        db.transaction(async tx => {
          await new SqliteAudioRepository(tx).save(buildAudio('a1'));
          throw new Error('boom');
        }),
      ).rejects.toThrow();
      expect(await audios.findById('a1')).toBeNull();
    });

    it('serializes outside statements behind an open transaction', async () => {
      const order: string[] = [];
      const tx = db.transaction(async inner => {
        await new SqliteAudioRepository(inner).save(buildAudio('a1'));
        order.push('tx');
      });
      const read = audios.findById('a1').then(found => {
        order.push(found ? 'read-after-commit' : 'read-before-commit');
      });
      await Promise.all([tx, read]);
      expect(order).toEqual(['tx', 'read-after-commit']);
    });
  });
});
