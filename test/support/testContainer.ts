import type { ZodType } from 'zod';
import {
  createContainer,
  type AppContainer,
} from '@app/dependency-injection/createContainer';
import type { DownloadedFileProcessor } from '@features/downloads';
import type { HttpClient } from '@infrastructure/http/HttpClient';
import { FakePlaybackEngine } from './FakePlaybackEngine';
import { NodeSqliteDriver } from './NodeSqliteDriver';
import {
  FakeClock,
  FakeDocumentPicker,
  FakeFileDownloader,
  FakeNetworkMonitor,
  FakeYouTubeExtractor,
  InMemoryFileStorage,
  sequentialIds,
  silentLogger,
} from './fakes';

export interface TestApp {
  container: AppContainer;
  storage: InMemoryFileStorage;
  downloader: FakeFileDownloader;
  network: FakeNetworkMonitor;
  engine: FakePlaybackEngine;
  picker: FakeDocumentPicker;
  clock: FakeClock;
  http: HttpClient & { responses: Map<string, unknown> };
  youtube: FakeYouTubeExtractor;
}

/**
 * Full composition root with real use cases and SQLite repositories; only
 * native/platform ports are replaced by deterministic fakes.
 */
export async function createTestApp(
  options: { dbPath?: string; fileProcessor?: DownloadedFileProcessor } = {},
): Promise<TestApp> {
  const storage = new InMemoryFileStorage();
  const downloader = new FakeFileDownloader(storage);
  const network = new FakeNetworkMonitor();
  const engine = new FakePlaybackEngine();
  const picker = new FakeDocumentPicker();
  const clock = new FakeClock();
  const youtube = new FakeYouTubeExtractor();
  const responses = new Map<string, unknown>();
  const http = {
    responses,
    async getJson<T>(url: string, schema: ZodType<T>): Promise<T> {
      if (!responses.has(url)) {
        throw new Error(`No fixture for ${url}`);
      }
      return schema.parse(responses.get(url));
    },
    async head() {
      return { status: 200 };
    },
  };
  const container = await createContainer({
    driver: new NodeSqliteDriver(options.dbPath),
    storage,
    picker,
    network,
    downloader,
    fileProcessor: options.fileProcessor,
    engine,
    http,
    youtube,
    logger: silentLogger,
    clock,
    generateId: sequentialIds('id'),
  });
  await container.start();
  return {
    container,
    storage,
    downloader,
    network,
    engine,
    picker,
    clock,
    http,
    youtube,
  };
}

/** Waits until queued async work (serialized commands, events) settles. */
export async function settle(times = 10): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>(resolve => setImmediate(() => resolve()));
  }
}

/** A file-backed database path, so two containers can share data (app restart). */
export function tempDatabasePath(): string {
  const env = (
    globalThis as unknown as { process: { env: Record<string, string | undefined> } }
  ).process.env;
  return `${env.TMPDIR ?? '/tmp'}/excultus-test-${Date.now()}-${Math.round(
    Math.random() * 1e9,
  )}.db`;
}
