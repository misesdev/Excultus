import type { ZodType } from 'zod';
import fixture from '@test/fixtures/archive-cofemaudio.json';
import type { HttpClient } from '../../http/HttpClient';
import {
  ArchiveOrgProvider,
  extractArchiveIdentifier,
  parseArchiveLength,
} from '../archive/ArchiveOrgProvider';

/** Deterministic HTTP double serving recorded Archive.org responses. */
function httpReturning(body: unknown): HttpClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async getJson<T>(url: string, schema: ZodType<T>) {
      calls.push(url);
      return schema.parse(body);
    },
    async head() {
      return { status: 200 };
    },
  };
}

const URL = 'https://archive.org/details/COFemAudio';

describe('ArchiveOrgProvider', () => {
  it('recognizes item URLs and extracts the identifier', () => {
    expect(extractArchiveIdentifier(URL)).toBe('COFemAudio');
    expect(
      extractArchiveIdentifier('https://www.archive.org/download/COFemAudio/file.mp3'),
    ).toBe('COFemAudio');
    expect(extractArchiveIdentifier('https://archive.org/metadata/COFemAudio')).toBe(
      'COFemAudio',
    );
    expect(extractArchiveIdentifier('http://archive.org/details/COFemAudio')).toBeNull();
    expect(extractArchiveIdentifier('https://archive.org/search?query=x')).toBeNull();
    expect(extractArchiveIdentifier('https://evil.com/details/COFemAudio')).toBeNull();
    expect(extractArchiveIdentifier('https://archive.org/details/../etc')).toBeNull();
  });

  it('parses Archive.org duration formats', () => {
    expect(parseArchiveLength('4104.91')).toBe(4104910);
    expect(parseArchiveLength('01:05')).toBe(65000);
    expect(parseArchiveLength('1:00:00')).toBe(3600000);
    expect(parseArchiveLength('0')).toBeUndefined();
    expect(parseArchiveLength(undefined)).toBeUndefined();
  });

  it('maps item metadata with plain-text description', async () => {
    const provider = new ArchiveOrgProvider(httpReturning(fixture));
    const metadata = await provider.getMetadata(URL);
    expect(metadata).toMatchObject({
      sourceType: 'archive',
      sourceId: 'COFemAudio',
      creator: 'Olavo de Carvalho',
      license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
      artworkUrl: 'https://archive.org/services/img/COFemAudio',
    });
    expect(metadata.description).toContain('Carvalho\nTodas as aulas');
    expect(metadata.description).not.toContain('<div>');
  });

  it('groups originals and derivatives into one item per recording, preferring MP3', async () => {
    const http = httpReturning(fixture);
    const provider = new ArchiveOrgProvider(http);
    const items = await provider.getAudioItems(URL);

    const lectures = items.filter(item => item.sourceId.includes('PreCOF'));
    expect(lectures.map(item => item.sourceId)).toEqual([
      'COFemAudio/#PreCOF001.aac',
      'COFemAudio/#PreCOF002.aac',
      'COFemAudio/#PreCOF003.aac',
    ]);
    expect(lectures[0]).toMatchObject({
      title: '#PreCOF001',
      fileExtension: 'mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 43347153,
      durationMs: 4104910,
      trackNumber: 1,
      availability: 'available',
      mediaUrl: 'https://archive.org/download/COFemAudio/%23PreCOF001.mp3',
      acquisition: {
        kind: 'download',
        url: 'https://archive.org/download/COFemAudio/%23PreCOF001.mp3',
        expectedMd5: '59982e66993859aee4012dd3d966f374',
      },
    });
  });

  it('ignores non-audio files and keeps restricted files unselectable', async () => {
    const items = await new ArchiveOrgProvider(httpReturning(fixture)).getAudioItems(URL);
    expect(items.some(item => /png|xml|torrent|sqlite/i.test(item.sourceId))).toBe(false);
    const restricted = items.find(item => item.sourceId.endsWith('private-lecture.mp3'));
    expect(restricted).toMatchObject({
      availability: 'restricted',
      acquisition: { kind: 'none' },
    });
    expect(restricted?.mediaUrl).toBeUndefined();
    const bonus = items.find(item => item.sourceId.endsWith('Bonus Track.ogg'));
    expect(bonus).toMatchObject({
      title: 'Faixa bônus',
      durationMs: 65000,
      fileExtension: 'ogg',
    });
    expect(bonus?.mediaUrl).toBe(
      'https://archive.org/download/COFemAudio/extras/Bonus%20Track.ogg',
    );
  });

  it('fetches the item once for metadata and files', async () => {
    const http = httpReturning(fixture);
    const provider = new ArchiveOrgProvider(http);
    await provider.getMetadata(URL);
    await provider.getAudioItems(URL);
    expect(http.calls).toEqual(['https://archive.org/metadata/COFemAudio']);
  });

  it('reports missing or dark items as unavailable', async () => {
    await expect(
      new ArchiveOrgProvider(httpReturning({})).getMetadata(URL),
    ).rejects.toMatchObject({
      code: 'source-unavailable',
    });
    await expect(
      new ArchiveOrgProvider(
        httpReturning({ metadata: { identifier: 'x' }, is_dark: true }),
      ).getAudioItems(URL),
    ).rejects.toMatchObject({ code: 'source-unavailable' });
  });

  it('rejects unexpected response shapes', async () => {
    const provider = new ArchiveOrgProvider(
      httpReturning({ metadata: {}, files: 'nope' }),
    );
    await expect(provider.getAudioItems(URL)).rejects.toBeDefined();
  });
});
