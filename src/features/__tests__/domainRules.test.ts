import {
  createAudio,
  mergeAudioMetadata,
  resolveAudioExtension,
  isRemotelyPlayable,
} from '@features/audios';
import {
  collectionProgress,
  createCollection,
  normalizeCollectionInput,
} from '@features/collections';
import { createBookmark } from '@features/bookmarks';
import {
  isSelectable,
  selectAll,
  summarizeSelection,
  toggleSelection,
} from '@features/imports';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from '@features/settings';
import { toSearchTerms } from '@features/search';
import { createPlaylist } from '@features/playlists';

const NOW = '2026-01-01T00:00:00.000Z';

describe('audio entity', () => {
  it('normalizes input and rejects empty titles', () => {
    const audio = createAudio(
      { title: '  Aula   1 ', sourceType: 'archive', durationMs: -5, artist: ' ' },
      'a1',
      NOW,
    );
    expect(audio).toMatchObject({
      title: 'Aula 1',
      durationMs: undefined,
      artist: undefined,
    });
    expect(() => createAudio({ title: '   ', sourceType: 'local' }, 'a', NOW)).toThrow(
      /title/,
    );
  });

  it('merges re-imported metadata without losing known data', () => {
    const existing = {
      ...createAudio({ title: 'Old', sourceType: 'archive', durationMs: 5000 }, 'a', NOW),
      artworkPath: '/art.jpg',
    };
    const merged = mergeAudioMetadata(
      existing,
      { title: 'New', sourceType: 'archive', artworkPath: '/other.jpg' },
      'later',
    );
    expect(merged).toMatchObject({
      id: 'a',
      title: 'New',
      durationMs: 5000,
      artworkPath: '/art.jpg',
      createdAt: NOW,
      updatedAt: 'later',
    });
  });

  it('never treats YouTube links as playable media', () => {
    expect(
      isRemotelyPlayable(
        createAudio(
          { title: 'v', sourceType: 'youtube', mediaUrl: 'https://x' },
          'a',
          NOW,
        ),
      ),
    ).toBe(false);
    expect(
      isRemotelyPlayable(
        createAudio(
          { title: 'v', sourceType: 'direct', mediaUrl: 'https://x/a.mp3' },
          'a',
          NOW,
        ),
      ),
    ).toBe(true);
  });

  it('validates extension together with MIME type', () => {
    expect(resolveAudioExtension({ fileName: 'a.MP3' })).toBe('mp3');
    expect(
      resolveAudioExtension({ fileName: 'a.mp3', mimeType: 'application/octet-stream' }),
    ).toBe('mp3');
    expect(resolveAudioExtension({ fileName: 'a.mp3', mimeType: 'audio/mp4' })).toBe(
      'm4a',
    );
    expect(
      resolveAudioExtension({
        fileName: 'evil.exe',
        mimeType: 'application/x-msdownload',
      }),
    ).toBeUndefined();
    expect(resolveAudioExtension({ fileName: 'noext', mimeType: 'audio/ogg' })).toBe(
      'ogg',
    );
    expect(resolveAudioExtension({ fileName: 'https://x.org/%23file.flac?dl=1' })).toBe(
      'flac',
    );
  });
});

describe('collections and playlists', () => {
  it('validates names and descriptions', () => {
    expect(normalizeCollectionInput({ name: '  Curso  ', description: '  ' })).toEqual({
      name: 'Curso',
      description: undefined,
    });
    expect(() => normalizeCollectionInput({ name: '' })).toThrow();
    expect(() => normalizeCollectionInput({ name: 'x'.repeat(81) })).toThrow(/too long/);
    expect(createCollection({ name: 'A' }, 'c', NOW).sortMode).toBe('custom');
    expect(() => createPlaylist({ name: ' ' }, 'p', NOW)).toThrow();
  });

  it('computes overall progress', () => {
    const collection = createCollection({ name: 'A' }, 'c', NOW);
    expect(
      collectionProgress({
        collection,
        audioCount: 2,
        totalDurationMs: 200,
        offlineCount: 0,
        listenedMs: 50,
      }),
    ).toBe(0.25);
    expect(
      collectionProgress({
        collection,
        audioCount: 0,
        totalDurationMs: 0,
        offlineCount: 0,
        listenedMs: 0,
      }),
    ).toBe(0);
  });
});

describe('bookmarks', () => {
  it('requires a valid position and trims optional text', () => {
    expect(
      createBookmark(
        { audioId: 'a', positionMs: 1500.6, title: '  Ideia ', note: ' ' },
        'b',
        NOW,
      ),
    ).toEqual({
      id: 'b',
      audioId: 'a',
      positionMs: 1501,
      title: 'Ideia',
      note: undefined,
      createdAt: NOW,
    });
    expect(() => createBookmark({ audioId: 'a', positionMs: -1 }, 'b', NOW)).toThrow();
  });
});

describe('import selection', () => {
  const items = [
    { sourceId: 'a', sizeBytes: 100, availability: 'available' as const },
    { sourceId: 'b', availability: 'available' as const },
    { sourceId: 'c', sizeBytes: 50, availability: 'restricted' as const },
  ];

  it('never selects restricted items', () => {
    expect([...selectAll(items)]).toEqual(['a', 'b']);
    expect(isSelectable(items[2]!)).toBe(false);
    expect(toggleSelection(new Set(), items[2]!).size).toBe(0);
    expect([...toggleSelection(new Set(['a']), items[0]!)]).toEqual([]);
  });

  it('estimates the total size and counts unknown sizes', () => {
    expect(summarizeSelection(items, new Set(['a', 'b']))).toEqual({
      count: 2,
      totalBytes: 100,
      unknownSizeCount: 1,
    });
  });
});

describe('settings', () => {
  it('falls back to defaults for invalid persisted values', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const settings = normalizeSettings({
      playback: { defaultSpeed: 7, autoResume: false },
      downloads: { maxConcurrent: '3' },
    });
    expect(settings.playback.defaultSpeed).toBe(1);
    expect(settings.playback.autoResume).toBe(false);
    expect(settings.downloads.maxConcurrent).toBe(2);
  });

  it('applies partial patches', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, { downloads: { wifiOnly: true } });
    expect(next.downloads).toEqual({ ...DEFAULT_SETTINGS.downloads, wifiOnly: true });
    expect(next.playback).toEqual(DEFAULT_SETTINGS.playback);
  });
});

describe('search terms', () => {
  it('strips operators and punctuation', () => {
    expect(toSearchTerms(' "Aula" (introdução)*: OR - x ')).toEqual([
      'aula',
      'introdução',
      'or',
      'x',
    ]);
    expect(toSearchTerms(undefined)).toEqual([]);
  });
});
