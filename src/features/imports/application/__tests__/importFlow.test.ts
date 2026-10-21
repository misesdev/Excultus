/**
 * @jest-environment node
 */
import fixture from '@test/fixtures/archive-cofemaudio.json';
import { archiveItem, archivePreview, importItems } from '@test/support/seed';
import { createTestApp, settle, type TestApp } from '@test/support/testContainer';

describe('import flow (URL -> preview -> confirm)', () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  it('previews the COFemAudio item, imports a selection into a new collection and queues downloads', async () => {
    app.http.responses.set('https://archive.org/metadata/COFemAudio', fixture);
    app.storage.remoteFiles.set(
      'https://archive.org/services/img/COFemAudio',
      'jpeg-bytes',
    );

    const preview = await app.container.imports.previewFromUrl(
      ' https://archive.org/details/COFemAudio ',
    );
    expect(preview.providerLabel).toBe('Internet Archive');
    expect(preview.items.length).toBe(5);

    const selected = preview.items.slice(0, 2).map(item => item.sourceId);
    const result = await app.container.imports.confirm({
      preview,
      selectedSourceIds: selected,
      target: { kind: 'new', name: 'COF' },
      downloadNow: true,
    });

    expect(result.audioIds).toHaveLength(2);
    expect(result.enqueuedDownloads).toBe(2);
    const detail = await app.container.collections.getDetail(result.collectionId!);
    expect(detail.summary.collection).toMatchObject({
      name: 'COF',
      artworkPath: '/app/artwork/archive-COFemAudio.jpg',
    });
    expect(detail.items.map(item => item.audio.title)).toEqual([
      '#PreCOF001',
      '#PreCOF002',
    ]);
    expect(detail.items[0]!.audio).toMatchObject({
      artist: 'Olavo de Carvalho',
      album: 'COFemAudio',
      sourceType: 'archive',
    });
    expect(app.downloader.started.map(task => task.url)).toEqual([
      'https://archive.org/download/COFemAudio/%23PreCOF001.mp3',
      'https://archive.org/download/COFemAudio/%23PreCOF002.mp3',
    ]);
  });

  it('rejects unsupported URLs with a typed error', async () => {
    await expect(
      app.container.imports.previewFromUrl('https://example.org/page'),
    ).rejects.toMatchObject({
      code: 'invalid-source-url',
    });
    await expect(
      app.container.imports.previewFromUrl('ftp://archive.org/details/x'),
    ).rejects.toMatchObject({
      code: 'invalid-source-url',
    });
  });

  it('deduplicates re-imports and lets one audio belong to many collections', async () => {
    const first = await importItems(app, ['a', 'b'], { kind: 'new', name: 'Um' });
    const second = await importItems(app, ['b', 'c'], { kind: 'new', name: 'Dois' });
    expect(second.audioIds[0]).toBe(first.audioIds[1]);
    const page = await app.container.search.search(
      { filter: 'all', sort: 'title' },
      { limit: 50, offset: 0 },
    );
    expect(page.items).toHaveLength(3);
    expect(
      await app.container.collections.findCollectionIdsForAudio(first.audioIds[1]!),
    ).toHaveLength(2);
  });

  it('is atomic: a failing target rolls back every audio', async () => {
    await expect(
      importItems(app, ['a'], { kind: 'existing', collectionId: 'missing' }),
    ).rejects.toMatchObject({ code: 'not-found' });
    const page = await app.container.search.search(
      { filter: 'all', sort: 'title' },
      { limit: 50, offset: 0 },
    );
    expect(page.items).toHaveLength(0);
  });

  it('never imports restricted items and requires a selection', async () => {
    const preview = archivePreview([
      archiveItem('a', {
        availability: 'restricted',
        acquisition: { kind: 'none' },
      }),
    ]);
    await expect(
      app.container.imports.confirm({
        preview,
        selectedSourceIds: ['item/a.mp3'],
        target: { kind: 'none' },
        downloadNow: true,
      }),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('copies device files into app storage and discards unselected copies', async () => {
    app.picker.audioFiles = [
      {
        localPath: '/cache/one.mp3',
        name: 'one.mp3',
        sizeBytes: 3,
        mimeType: 'audio/mpeg',
      },
      {
        localPath: '/cache/two.m4a',
        name: 'two.m4a',
        sizeBytes: 3,
        mimeType: 'audio/mp4',
      },
      {
        localPath: '/cache/doc.pdf',
        name: 'doc.pdf',
        sizeBytes: 3,
        mimeType: 'application/pdf',
      },
    ];
    for (const file of app.picker.audioFiles) {
      app.storage.files.set(file.localPath, 'abc');
    }
    const preview = await app.container.imports.previewLocalFiles();
    expect(preview?.items.map(item => item.title)).toEqual(['one', 'two']);
    expect(preview?.rejected).toEqual(['doc.pdf']);
    expect(app.storage.files.has('/cache/doc.pdf')).toBe(false);

    const result = await app.container.imports.confirm({
      preview: preview!,
      selectedSourceIds: [preview!.items[0]!.sourceId],
      target: { kind: 'none' },
      downloadNow: true,
    });
    await settle();
    const item = await app.container.audios.getItem(result.audioIds[0]!);
    expect(item).toMatchObject({
      offline: 'available',
      localPath: `/app/audio/${item.audio.id}.mp3`,
    });
    expect(app.storage.files.has('/cache/one.mp3')).toBe(false);
    expect(app.storage.files.has('/cache/two.m4a')).toBe(false);
  });

  it('imports a YouTube video as a downloaded M4A, resolving the stream per download', async () => {
    app.youtube.addVideo('dQw4w9WgXcQ', { title: 'Palestra', contentLength: 5 });
    const preview = await app.container.imports.previewFromUrl(
      'https://youtu.be/dQw4w9WgXcQ',
    );
    expect(preview.items[0]).toMatchObject({
      sourceId: 'video:dQw4w9WgXcQ',
      availability: 'available',
      fileExtension: 'm4a',
      acquisition: {
        kind: 'download',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    });
    const result = await app.container.imports.confirm({
      preview,
      selectedSourceIds: [preview.items[0]!.sourceId],
      target: { kind: 'none' },
      downloadNow: true,
    });
    expect(result.enqueuedDownloads).toBe(1);
    await settle();

    // The expiring media URL is resolved right before the transfer.
    const [started] = app.downloader.started;
    expect(started!.url).toMatch(/^https:\/\/rr1\.googlevideo\.com\//);
    app.downloader.fail(started!.taskId, 'http', 403);
    await app.container.downloads.retry(result.audioIds[0]!);
    await settle();
    const retried = app.downloader.request(started!.taskId);
    expect(retried.url).not.toBe(started!.url);

    app.downloader.complete(started!.taskId, '12345');
    await settle();
    const item = await app.container.audios.getItem(result.audioIds[0]!);
    expect(item).toMatchObject({
      offline: 'available',
      localPath: `/app/audio/${item.audio.id}.m4a`,
    });
    expect(item.audio).toMatchObject({ sourceType: 'youtube', title: 'Palestra' });
  });

  it('refuses a YouTube video without downloadable audio instead of saving the link', async () => {
    await expect(
      app.container.imports.previewFromUrl('https://www.youtube.com/watch?v=privat3vid0'),
    ).rejects.toMatchObject({
      code: 'source-unavailable',
      userMessage: expect.stringContaining('não pode ser baixado'),
    });
    expect(app.downloader.started).toHaveLength(0);
  });

  it('marks unavailable playlist videos as restricted and imports only the others', async () => {
    app.youtube.addVideo('aaaaaaaaaaa');
    app.youtube.playlists.set('PLxxxxxxxxxx', {
      id: 'PLxxxxxxxxxx',
      title: 'Curso',
      entries: [
        { id: 'aaaaaaaaaaa', title: 'Aula 1' },
        { id: 'bbbbbbbbbbb', title: 'Aula 2 (privada)' },
        { id: 'aaaaaaaaaaa', title: 'Aula 1 (repetida)' },
      ],
      truncated: false,
    });
    const preview = await app.container.imports.previewFromUrl(
      'https://www.youtube.com/playlist?list=PLxxxxxxxxxx',
    );
    expect(preview.source.title).toBe('Curso');
    expect(preview.items.map(item => [item.sourceId, item.availability])).toEqual([
      ['video:aaaaaaaaaaa', 'available'],
      ['video:bbbbbbbbbbb', 'restricted'],
    ]);
    const result = await app.container.imports.confirm({
      preview,
      selectedSourceIds: preview.items.map(item => item.sourceId),
      target: { kind: 'new', name: 'Curso' },
      downloadNow: true,
    });
    expect(result.audioIds).toHaveLength(1);
    expect(result.enqueuedDownloads).toBe(1);
  });

  it('fails a YouTube playlist import when offline', async () => {
    app.youtube.offline = true;
    await expect(
      app.container.imports.previewFromUrl(
        'https://www.youtube.com/playlist?list=PLxxxxxxxxxx',
      ),
    ).rejects.toMatchObject({ code: 'network' });
  });

  it('supports direct audio links', async () => {
    const preview = await app.container.imports.previewFromUrl(
      'https://cdn.example.org/podcasts/ep_01.mp3#t=10',
    );
    expect(preview.items[0]).toMatchObject({
      title: 'ep 01',
      sourceId: 'https://cdn.example.org/podcasts/ep_01.mp3',
      fileExtension: 'mp3',
      acquisition: { kind: 'download' },
    });
  });
});

describe('collections', () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  it('keeps or frees exclusive downloads when a collection is deleted', async () => {
    const shared = await importItems(app, ['a', 'b'], { kind: 'new', name: 'Um' });
    await importItems(app, ['b'], { kind: 'new', name: 'Dois' });
    await app.container.downloadCommands.downloadAudios(shared.audioIds);
    for (const task of app.downloader.started) {
      app.downloader.complete(task.taskId, 'hello');
    }
    await settle();

    await app.container.collections.delete(
      shared.collectionId!,
      'delete-exclusive-downloads',
    );
    await settle();
    const [a, b] = await app.container.audios.getItems(shared.audioIds);
    expect(a?.offline).toBe('not-downloaded'); // exclusive: file removed, metadata kept
    expect(b?.offline).toBe('available'); // shared with "Dois": preserved
  });

  it('reorders, sorts and filters items', async () => {
    const { collectionId, audioIds } = await importItems(app, ['a', 'b', 'c']);
    await app.container.collections.reorder(collectionId!, [
      audioIds[2]!,
      audioIds[0]!,
      audioIds[1]!,
    ]);
    const custom = await app.container.collections.getDetail(collectionId!);
    expect(custom.items.map(item => item.audio.id)).toEqual([
      audioIds[2],
      audioIds[0],
      audioIds[1],
    ]);
    const byTitle = await app.container.collections.getDetail(collectionId!, {
      sort: 'title',
    });
    expect(byTitle.items.map(item => item.audio.title)).toEqual([
      'Aula a',
      'Aula b',
      'Aula c',
    ]);
    const filtered = await app.container.collections.getDetail(collectionId!, {
      text: 'aula b',
    });
    expect(filtered.items).toHaveLength(1);
  });

  it('chooses an app-owned artwork copy', async () => {
    const { id } = await app.container.collections.create({ name: 'Capa' });
    app.picker.image = { localPath: '/cache/cover.png', name: 'cover.png' };
    app.storage.files.set('/cache/cover.png', 'png');
    expect(await app.container.collections.chooseArtwork(id)).toBe(true);
    const collection = await app.container.collections.get(id);
    expect(collection.artworkPath).toMatch(
      new RegExp(`^/app/artwork/collection-${id}-.+\\.png$`),
    );
    await app.container.collections.delete(id, 'keep-files');
    expect(app.storage.files.has(collection.artworkPath!)).toBe(false);
  });
});

describe('backup', () => {
  it('exports and restores into another device without duplicates', async () => {
    const source = await createTestApp();
    const { audioIds } = await importItems(source, ['a', 'b']);
    await source.container.audios.toggleFavorite(audioIds[0]!);
    await source.container.bookmarks.add({
      audioId: audioIds[1]!,
      positionMs: 1000,
      note: 'nota',
    });
    await source.container.playlists.create({ name: 'Lista' });
    await source.container.settings.update({ playback: { defaultSpeed: 1.5 } });
    expect(await source.container.backup.export('full')).toBe(true);
    const exported = source.picker.saved[0]!;
    expect(exported.fileName).toMatch(/^excultus-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const target = await createTestApp();
    await importItems(target, ['a']); // already has one of the audios
    const content = await captureExport(source);
    target.picker.json = { localPath: '/cache/backup.json', name: 'backup.json' };
    target.storage.files.set('/cache/backup.json', content);

    const report = await target.container.backup.restore();
    expect(report).toMatchObject({ audios: 2, collections: 1, playlists: 1 });
    const library = await target.container.search.search(
      { filter: 'all', sort: 'title' },
      { limit: 10, offset: 0 },
    );
    expect(library.items.map(item => item.audio.title)).toEqual(['Aula a', 'Aula b']);
    expect(library.items[0]!.isFavorite).toBe(true);
    expect(await target.container.bookmarks.listAll()).toHaveLength(1);
    expect(target.container.settings.get().playback.defaultSpeed).toBe(1.5);

    // The picked copy is cleaned up after restoring; picking it again is idempotent.
    expect(target.storage.files.has('/cache/backup.json')).toBe(false);
    target.storage.files.set('/cache/backup.json', content);
    await target.container.backup.restore();
    expect((await target.container.bookmarks.listAll()).length).toBe(1);
    const again = await target.container.search.search(
      { filter: 'all', sort: 'title' },
      { limit: 10, offset: 0 },
    );
    expect(again.items).toHaveLength(2);
  });

  it('rejects invalid backup files', async () => {
    const app = await createTestApp();
    app.picker.json = { localPath: '/cache/bad.json', name: 'bad.json' };
    app.storage.files.set('/cache/bad.json', '{"format":"other"}');
    await expect(app.container.backup.restore()).rejects.toMatchObject({
      code: 'validation',
    });
  });
});

/** Captures the JSON written by the export use case before it is cleaned up. */
async function captureExport(app: TestApp): Promise<string> {
  let captured = '';
  const original = app.storage.writeText.bind(app.storage);
  app.storage.writeText = async (path: string, content: string) => {
    captured = content;
    return original(path, content);
  };
  await app.container.backup.export('full');
  return captured;
}
