/**
 * @jest-environment node
 */
import { downloadAudio, importItems, importYouTubeVideos } from '@test/support/seed';
import { createTestApp, settle, type TestApp } from '@test/support/testContainer';

/**
 * Deleting from the Downloads tab, and what playback does with audios that
 * have no file anymore (YouTube audio only plays downloaded).
 */
describe('removing downloads and playing what is left', () => {
  let app: TestApp;
  let playlistId: string;
  let collectionId: string;
  let videos: string[];

  beforeEach(async () => {
    app = await createTestApp();
    videos = await importYouTubeVideos(app, [
      'video000001',
      'video000002',
      'video000003',
    ]);
    for (const audioId of videos) {
      await downloadAudio(app, audioId);
    }
    playlistId = (await app.container.playlists.create({ name: 'Favoritas' })).id;
    await app.container.playlists.addAudios(playlistId, videos);
    collectionId = (await app.container.collections.create({ name: 'Músicas' })).id;
    await app.container.collections.addAudios(collectionId, videos);
  });

  afterEach(() => app.container.downloads.stop());

  const player = () => app.container.player;
  const playlistIds = async () =>
    (await app.container.playlists.getDetail(playlistId)).items.map(
      item => item.audio.id,
    );

  it('"apagar só o arquivo" keeps the audio in the library, playlist and collection', async () => {
    await app.container.downloads.deleteDownloadedFile(videos[0]!);

    const item = await app.container.audios.getItem(videos[0]!);
    expect(item.offline).toBe('not-downloaded');
    expect(item.localPath).toBeUndefined();
    expect(app.storage.files.has(`/app/audio/${videos[0]}.m4a`)).toBe(false);
    expect(await playlistIds()).toEqual(videos);
    expect(await app.container.collections.listAudioIds(collectionId, 'custom')).toEqual(
      videos,
    );
  });

  it('"remover da biblioteca" also removes it from playlists, collections and disk', async () => {
    await app.container.audios.deleteFromLibrary(videos[0]!);

    await expect(app.container.audios.getItem(videos[0]!)).rejects.toMatchObject({
      code: 'not-found',
    });
    expect(await playlistIds()).toEqual(videos.slice(1));
    expect(await app.container.collections.listAudioIds(collectionId, 'custom')).toEqual(
      videos.slice(1),
    );
    expect(app.storage.files.has(`/app/audio/${videos[0]}.m4a`)).toBe(false);
    expect(
      (await app.container.storage.listDownloads()).map(e => e.download.audioId),
    ).toEqual(expect.not.arrayContaining([videos[0]]));
  });

  it('stops playback when the audio being played is removed from the library', async () => {
    await player().playQueue(videos, 0);
    await app.container.audios.deleteFromLibrary(videos[0]!);

    const state = player().getState();
    expect(state.queue.items).toEqual(videos.slice(1));
    expect(state.current?.audioId).toBe(videos[1]);
    expect(app.engine.playing).toBe(false);
  });

  it('skips a YouTube audio whose file was deleted when playing the playlist', async () => {
    await app.container.downloads.deleteDownloadedFile(videos[0]!);

    await player().playQueue(await playlistIds(), 0, { contextLabel: 'Favoritas' });

    expect(player().getState()).toMatchObject({
      current: { audioId: videos[1], isLocal: true },
      status: expect.not.stringMatching('error'),
    });
    expect(app.engine.loaded?.track.url).toBe(`file:///app/audio/${videos[1]}.m4a`);
    expect(app.engine.playing).toBe(true);
  });

  it('skips it when the previous track ends', async () => {
    await app.container.downloads.deleteDownloadedFile(videos[1]!);
    await player().playQueue(videos, 0);

    app.engine.emit({ type: 'ended' });
    await settle();

    expect(player().getState().current?.audioId).toBe(videos[2]);
    expect(app.engine.playing).toBe(true);
  });

  it('skips it when skipping to the next track', async () => {
    await app.container.downloads.deleteDownloadedFile(videos[1]!);
    await player().playQueue(videos, 0);

    await player().skipToNext();

    expect(player().getState().current?.audioId).toBe(videos[2]);
  });

  it('rejects with a friendly message when nothing in the list can play, keeping playback', async () => {
    await player().playQueue([videos[2]!], 0);
    await app.container.downloads.deleteDownloadedFile(videos[0]!);
    await app.container.downloads.deleteDownloadedFile(videos[1]!);

    await expect(player().playQueue(videos.slice(0, 2), 0)).rejects.toMatchObject({
      code: 'audio-playback',
      userMessage: expect.stringContaining('Nenhum áudio desta lista pode tocar agora'),
    });
    expect(player().getState().current?.audioId).toBe(videos[2]);
    expect(app.engine.playing).toBe(true);
  });

  it('downloads the YouTube audio again on demand after only its file was deleted', async () => {
    await app.container.downloads.deleteDownloadedFile(videos[0]!);
    const started = app.downloader.started.length;

    await expect(
      app.container.downloadCommands.downloadAudios([videos[0]!]),
    ).resolves.toEqual({
      enqueued: 1,
      unavailable: 0,
    });
    expect(app.downloader.started).toHaveLength(started + 1);
    expect(app.downloader.started.at(-1)!.url).toMatch(/googlevideo\.com/);
  });
});

describe('offline playback', () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(() => app.container.downloads.stop());

  it('skips audios that are not downloaded and plays the downloaded ones', async () => {
    const ids = (await importItems(app, ['a', 'b', 'c'])).audioIds;
    await downloadAudio(app, ids[1]!);
    app.network.set({ isConnected: false, isWifi: false });

    await app.container.player.playQueue(ids, 0);

    expect(app.container.player.getState().current).toMatchObject({
      audioId: ids[1],
      isLocal: true,
    });
  });
});
