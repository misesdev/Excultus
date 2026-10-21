/**
 * @jest-environment node
 */
import { buildAudio } from '@test/support/builders';
import { createTestApp, settle, type TestApp } from '@test/support/testContainer';

describe('DownloadManager', () => {
  let app: TestApp;

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    app = await createTestApp();
  });

  afterEach(() => {
    app.container.downloads.stop();
    jest.useRealTimers();
  });

  async function insertAudio(id: string, fileSize = 5) {
    const audio = buildAudio(id, {
      fileSize,
      mediaUrl: `https://archive.org/download/item/${id}.mp3`,
    });
    await app.container.imports.confirm({
      preview: {
        providerLabel: 'test',
        source: {
          sourceType: 'archive',
          sourceId: 'item',
          title: 'Item',
          originalUrl: 'https://archive.org/details/item',
        },
        items: [
          {
            sourceId: audio.sourceId ?? id,
            title: audio.title,
            sizeBytes: fileSize,
            fileExtension: 'mp3',
            mediaUrl: audio.mediaUrl,
            availability: 'available',
            acquisition: { kind: 'download', url: audio.mediaUrl ?? '' },
          },
        ],
        rejected: [],
      },
      selectedSourceIds: [audio.sourceId ?? id],
      target: { kind: 'none' },
      downloadNow: false,
    });
    const item = (
      await app.container.search.search(
        { filter: 'all', sort: 'addedAt' },
        { limit: 50, offset: 0 },
      )
    ).items.find(candidate => candidate.audio.sourceId === audio.sourceId);
    return item!.audio.id;
  }

  const request = (audioId: string, expectedBytes = 5, expectedMd5?: string) => ({
    audioId,
    url: `https://archive.org/download/item/${audioId}.mp3`,
    fileExtension: 'mp3',
    expectedBytes,
    expectedMd5,
  });

  it('downloads to a temp file, validates and moves it to the final path', async () => {
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId, 5, 'md5:hello')]);
    const task = app.downloader.started[0]!;
    expect(task.destinationPath).toMatch(/^\/app\/temp\//);

    app.downloader.complete(task.taskId, 'hello');
    await settle();

    const item = await app.container.audios.getItem(audioId);
    expect(item.offline).toBe('available');
    expect(item.localPath).toBe(`/app/audio/${audioId}.mp3`);
    expect(app.storage.files.has(task.destinationPath)).toBe(false);
    expect(app.storage.files.get(`/app/audio/${audioId}.mp3`)).toBe('hello');
  });

  it('rejects corrupted files (size or checksum mismatch)', async () => {
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId, 5, 'md5:hello')]);
    const task = app.downloader.started[0]!;
    app.downloader.complete(task.taskId, 'howdy');
    await settle();

    const item = await app.container.audios.getItem(audioId);
    expect(item.offline).toBe('failed');
    expect(app.storage.files.size).toBe(0);
  });

  it('prevents duplicate downloads of the same audio', async () => {
    const audioId = await insertAudio('a1');
    expect(
      await app.container.downloads.enqueue([request(audioId), request(audioId)]),
    ).toBe(1);
    expect(await app.container.downloads.enqueue([request(audioId)])).toBe(0);
    expect(app.downloader.started).toHaveLength(1);
  });

  it('respects the concurrency limit and starts the next one when a slot frees', async () => {
    await app.container.settings.update({ downloads: { maxConcurrent: 1 } });
    const first = await insertAudio('a1');
    const second = await insertAudio('a2');
    await app.container.downloads.enqueue([request(first), request(second)]);
    expect(app.downloader.started.map(task => task.taskId)).toHaveLength(1);

    app.downloader.complete(app.downloader.started[0]!.taskId, 'hello');
    await settle();
    expect(app.downloader.started).toHaveLength(2);
  });

  it('pauses keeping the partial file and resumes from it', async () => {
    const audioId = await insertAudio('a1', 10);
    await app.container.downloads.enqueue([request(audioId, 10)]);
    const task = app.downloader.started[0]!;
    app.downloader.writeBytes(task.taskId, 'hello');
    await app.container.downloads.pause(audioId);

    expect(app.downloader.stopped).toEqual([task.taskId]);
    expect(app.container.downloads.getSnapshot().byAudioId[audioId]).toMatchObject({
      status: 'paused',
      bytesDownloaded: 5,
    });

    await app.container.downloads.resume(audioId);
    expect(app.downloader.started).toHaveLength(2);
    expect(app.downloader.started[1]!.destinationPath).toBe(task.destinationPath);
    app.downloader.complete(task.taskId, 'world');
    await settle();
    expect(app.storage.files.get(`/app/audio/${audioId}.mp3`)).toBe('helloworld');
  });

  it('retries transient failures with backoff, then gives up', async () => {
    await app.container.settings.update({ downloads: { autoRetryAttempts: 1 } });
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId)]);
    app.downloader.fail(app.downloader.started[0]!.taskId, 'network');
    await settle();
    expect(app.container.downloads.getSnapshot().byAudioId[audioId]?.status).toBe(
      'queued',
    );

    app.clock.advance(2000);
    jest.advanceTimersByTime(2000);
    await settle();
    expect(app.downloader.started).toHaveLength(2);

    app.downloader.fail(app.downloader.started[1]!.taskId, 'network');
    await settle();
    expect(app.container.downloads.getSnapshot().byAudioId[audioId]).toMatchObject({
      status: 'failed',
      errorCode: 'network',
    });
  });

  it('fails fast without enough storage', async () => {
    app.storage.freeBytes = 1000;
    const audioId = await insertAudio('a1', 500);
    await app.container.downloads.enqueue([request(audioId, 500)]);
    expect(app.downloader.started).toHaveLength(0);
    expect(app.container.downloads.getSnapshot().byAudioId[audioId]?.errorCode).toBe(
      'insufficient-storage',
    );
  });

  it('waits for Wi-Fi when configured and stops on network loss', async () => {
    await app.container.settings.update({ downloads: { wifiOnly: true } });
    app.network.set({ isConnected: true, isWifi: false });
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId)]);
    expect(app.downloader.started).toHaveLength(0);
    expect(app.container.downloads.getSnapshot().waitingForNetwork).toBe(true);

    app.network.set({ isConnected: true, isWifi: true });
    await settle();
    expect(app.downloader.started).toHaveLength(1);

    app.network.set({ isConnected: false, isWifi: false });
    await settle();
    expect(app.downloader.stopped).toHaveLength(1);
    expect(app.container.downloads.getSnapshot().byAudioId[audioId]?.status).toBe(
      'queued',
    );
  });

  it('cancels and removes the partial file', async () => {
    const audioId = await insertAudio('a1', 10);
    await app.container.downloads.enqueue([request(audioId, 10)]);
    const task = app.downloader.started[0]!;
    app.downloader.writeBytes(task.taskId, 'abc');
    await app.container.downloads.cancel(audioId);
    expect(app.storage.files.has(task.destinationPath)).toBe(false);
    expect((await app.container.audios.getItem(audioId)).offline).toBe('not-downloaded');
  });

  it('deletes a downloaded file while keeping the audio metadata', async () => {
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId)]);
    app.downloader.complete(app.downloader.started[0]!.taskId, 'hello');
    await settle();
    await app.container.downloads.deleteDownloadedFile(audioId);

    const item = await app.container.audios.getItem(audioId);
    expect(item.offline).toBe('not-downloaded');
    expect(app.storage.files.size).toBe(0);
  });

  it('cleans orphan temp files and detects missing local files', async () => {
    const audioId = await insertAudio('a1');
    await app.container.downloads.enqueue([request(audioId)]);
    app.downloader.complete(app.downloader.started[0]!.taskId, 'hello');
    await settle();
    app.storage.files.set('/app/temp/orphan.part', 'xxx');
    app.storage.files.set('/app/audio/orphan.mp3', 'yyy');
    app.storage.files.delete(`/app/audio/${audioId}.mp3`);

    expect(await app.container.storage.cleanTemporaryFiles()).toBe(3);
    expect(await app.container.storage.verifyLocalFiles()).toEqual({
      checked: 1,
      missing: 1,
      orphansRemoved: 1,
    });
    expect((await app.container.audios.getItem(audioId)).offline).toBe('failed');
  });
});
