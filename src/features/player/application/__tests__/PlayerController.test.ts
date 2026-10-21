/**
 * @jest-environment node
 */
import { archiveItem, archivePreview, importItems } from '@test/support/seed';
import {
  createTestApp,
  settle,
  tempDatabasePath,
  type TestApp,
} from '@test/support/testContainer';

describe('PlayerController', () => {
  let app: TestApp;
  let ids: string[];

  beforeEach(async () => {
    app = await createTestApp();
    ids = (await importItems(app, ['a', 'b', 'c'])).audioIds;
  });

  const player = () => app.container.player;

  it('streams remote audio when not downloaded and plays local files when available', async () => {
    await player().playQueue(ids, 0);
    expect(app.engine.loaded?.track.url).toBe('https://archive.org/download/item/a.mp3');
    expect(app.engine.playing).toBe(true);

    await app.container.downloads.enqueue([
      {
        audioId: ids[1]!,
        url: 'https://archive.org/download/item/b.mp3',
        fileExtension: 'mp3',
        expectedBytes: 5,
      },
    ]);
    app.downloader.complete(app.downloader.started[0]!.taskId, 'audio');
    await settle();
    await player().skipToNext();
    expect(app.engine.loaded?.track.url).toBe(`file:///app/audio/${ids[1]}.mp3`);
    expect(player().getState().current).toMatchObject({ audioId: ids[1], isLocal: true });
  });

  it('refuses to stream while offline and reports a playback error', async () => {
    app.network.set({ isConnected: false, isWifi: false });
    await player().play(ids[0]!);
    expect(player().getState()).toMatchObject({
      status: 'error',
      errorCode: 'audio-playback',
    });
  });

  it('persists progress periodically, on pause and resumes from it', async () => {
    await player().playQueue(ids, 0);
    app.engine.emit({ type: 'progress', positionMs: 30000, durationMs: 60000 });
    await player().pause();

    const item = await app.container.audios.getItem(ids[0]!);
    expect(item.progress).toMatchObject({ positionMs: 30000, completed: false });

    await player().playQueue([ids[1]!]);
    await player().playQueue([ids[0]!]);
    expect(app.engine.loaded?.startPositionMs).toBe(28000);
  });

  it('marks completion at the threshold and advances automatically', async () => {
    await player().playQueue(ids, 0);
    app.engine.emit({ type: 'progress', positionMs: 59000, durationMs: 60000 });
    app.engine.emit({ type: 'ended' });
    await settle();

    expect((await app.container.audios.getItem(ids[0]!)).progress?.completed).toBe(true);
    expect(player().getState().current?.audioId).toBe(ids[1]);
    expect(app.engine.loaded?.startPositionMs).toBe(0);
  });

  it('stops at the end of the queue unless repeating all', async () => {
    await player().playQueue(ids, 2);
    app.engine.emit({ type: 'ended' });
    await settle();
    expect(player().getState().current?.audioId).toBe(ids[2]);
    expect(player().getState().status).toBe('paused');

    await player().setRepeatMode('all');
    app.engine.emit({ type: 'ended' });
    await settle();
    expect(player().getState().current?.audioId).toBe(ids[0]);
  });

  it('handles jump, seek, speed and remote commands', async () => {
    await player().playQueue(ids, 0);
    app.engine.emit({ type: 'progress', positionMs: 10000, durationMs: 60000 });
    await player().skipForward();
    expect(app.engine.seeks.pop()).toBe(40000);
    await player().skipBackward();
    expect(app.engine.seeks.pop()).toBe(25000);
    await player().setSpeed(1.5);
    expect(app.engine.rate).toBe(1.5);

    app.engine.emit({ type: 'remote', command: { type: 'next' } });
    await settle();
    expect(player().getState().current?.audioId).toBe(ids[1]);
    app.engine.emit({ type: 'remote', command: { type: 'pause' } });
    await settle();
    expect(app.engine.playing).toBe(false);
  });

  it('restarts the track on "previous" after a few seconds', async () => {
    await player().playQueue(ids, 1);
    app.engine.emit({ type: 'progress', positionMs: 8000, durationMs: 60000 });
    await player().skipToPrevious();
    expect(player().getState().current?.audioId).toBe(ids[1]);
    expect(app.engine.seeks.pop()).toBe(0);
    await player().skipToPrevious();
    expect(player().getState().current?.audioId).toBe(ids[0]);
  });

  it('pauses when the sleep timer expires and supports end-of-track timers', async () => {
    await player().playQueue(ids, 0);
    player().setSleepTimer({
      kind: 'duration',
      minutes: 1,
      endsAtMs: app.clock.nowMs() + 60000,
    });
    app.clock.advance(61000);
    app.engine.emit({ type: 'progress', positionMs: 1000, durationMs: 60000 });
    await settle();
    expect(app.engine.playing).toBe(false);
    expect(player().getState().sleepTimer).toBeUndefined();

    await player().resume();
    player().setSleepTimer({ kind: 'end-of-track' });
    app.engine.emit({ type: 'ended' });
    await settle();
    expect(player().getState().current?.audioId).toBe(ids[0]);
  });

  it('records history and restores the session after a restart', async () => {
    const dbPath = tempDatabasePath();
    const first = await createTestApp({ dbPath });
    const queue = (await importItems(first, ['x', 'y'])).audioIds;
    await first.container.player.playQueue(queue, 1, { contextLabel: 'Curso' });
    await first.container.player.setSpeed(1.25);
    first.engine.emit({ type: 'progress', positionMs: 20000, durationMs: 60000 });
    await first.container.player.pause();
    const history = await first.container.history.recent({ limit: 10, offset: 0 });
    expect(history.items[0]?.item.audio.id).toBe(queue[1]);
    await first.container.dispose();

    const restarted = await createTestApp({ dbPath });
    const state = restarted.container.player.getState();
    expect(state).toMatchObject({
      status: 'paused',
      contextLabel: 'Curso',
      rate: 1.25,
      positionMs: 18000,
    });
    expect(state.current?.audioId).toBe(queue[1]);
    expect(restarted.engine.loaded).toBeNull(); // nothing plays until the user asks

    await restarted.container.player.resume();
    expect(restarted.engine.loaded?.startPositionMs).toBe(18000);
    expect(restarted.engine.playing).toBe(true);
  });

  it('learns the duration of files that did not report one', async () => {
    const preview = archivePreview([archiveItem('d', { durationMs: undefined })]);
    const { audioIds } = await app.container.imports.confirm({
      preview,
      selectedSourceIds: [preview.items[0]!.sourceId],
      target: { kind: 'none' },
      downloadNow: false,
    });
    expect(
      (await app.container.audios.getItem(audioIds[0]!)).audio.durationMs,
    ).toBeUndefined();
    await player().play(audioIds[0]!);
    app.engine.emit({ type: 'progress', positionMs: 1000, durationMs: 90000 });
    await settle();
    expect((await app.container.audios.getItem(audioIds[0]!)).audio.durationMs).toBe(
      90000,
    );
  });

  it('forgets audios deleted from the library', async () => {
    await player().playQueue(ids, 0);
    await app.container.audios.deleteFromLibrary(ids[0]!);
    expect(player().getState().queue.items).not.toContain(ids[0]);
    expect(player().getState().current?.audioId).toBe(ids[1]);
  });

  it('closes the session, hiding the mini player and clearing the saved queue', async () => {
    await player().playQueue(ids, 0);
    await player().close();
    expect(player().getState()).toMatchObject({ status: 'idle', current: undefined });
    expect(player().getState().queue.items).toHaveLength(0);
    expect(app.engine.playing).toBe(false);
  });
});
