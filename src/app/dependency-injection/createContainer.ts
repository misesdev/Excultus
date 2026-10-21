import {
  EventBus,
  generateId as defaultGenerateId,
  systemClock,
  type Clock,
  type DocumentPicker,
  type FileStorage,
  type IdGenerator,
  type Logger,
  type NetworkMonitor,
} from '@core/application';
import { createAudioUseCases } from '@features/audios';
import { createBookmarkUseCases } from '@features/bookmarks';
import { createCollectionUseCases } from '@features/collections';
import {
  createDownloadCommands,
  createStorageUseCases,
  DownloadManager,
  type DownloadedFileProcessor,
  type FileDownloader,
} from '@features/downloads';
import { createHistoryUseCases } from '@features/history';
import {
  createImportUseCases,
  SourceProviderRegistry,
  type ImportScope,
} from '@features/imports';
import {
  createProgressUseCases,
  PlayerController,
  type AudioPlaybackEngine,
} from '@features/player';
import { createPlaylistUseCases } from '@features/playlists';
import { createSearchUseCases } from '@features/search';
import { createBackupUseCases, SettingsService } from '@features/settings';
import { prepareDatabase } from '@infrastructure/database/openDatabase';
import { PlayerSessionRepository } from '@infrastructure/database/PlayerSessionRepository';
import {
  SqliteAudioRepository,
  SqliteFavoriteRepository,
} from '@infrastructure/database/repositories/SqliteAudioRepository';
import { SqliteBookmarkRepository } from '@infrastructure/database/repositories/SqliteBookmarkRepository';
import { SqliteCollectionRepository } from '@infrastructure/database/repositories/SqliteCollectionRepository';
import { SqliteDownloadRepository } from '@infrastructure/database/repositories/SqliteDownloadRepository';
import { SqliteKeyValueRepository } from '@infrastructure/database/repositories/SqliteKeyValueRepository';
import { SqliteLibrarySearchRepository } from '@infrastructure/database/repositories/SqliteLibrarySearchRepository';
import {
  SqliteHistoryRepository,
  SqlitePlaybackProgressRepository,
} from '@infrastructure/database/repositories/SqlitePlaybackRepositories';
import { SqlitePlaylistRepository } from '@infrastructure/database/repositories/SqlitePlaylistRepository';
import { SqliteBackupGateway } from '@infrastructure/database/SqliteBackupGateway';
import type { SqlDriver, SqlExecutor } from '@infrastructure/database/SqlDatabase';
import { SqliteUnitOfWork } from '@infrastructure/database/SqliteUnitOfWork';
import { ArchiveOrgProvider } from '@infrastructure/external-sources/archive/ArchiveOrgProvider';
import { DirectAudioProvider } from '@infrastructure/external-sources/direct/DirectAudioProvider';
import { LocalFileProvider } from '@infrastructure/external-sources/local/LocalFileProvider';
import type { YouTubeExtractor } from '@infrastructure/external-sources/youtube/YouTubeExtractor';
import { YouTubeMediaUrlResolver } from '@infrastructure/external-sources/youtube/YouTubeMediaUrlResolver';
import { YouTubeProvider } from '@infrastructure/external-sources/youtube/YouTubeProvider';
import type { HttpClient } from '@infrastructure/http/HttpClient';

/** Platform-specific adapters; tests replace them with fakes. */
export interface PlatformAdapters {
  driver: SqlDriver;
  storage: FileStorage;
  picker: DocumentPicker;
  network: NetworkMonitor;
  downloader: FileDownloader;
  /** Optional post-download step (MP4 remuxing); absent in most tests. */
  fileProcessor?: DownloadedFileProcessor;
  engine: AudioPlaybackEngine;
  http: HttpClient;
  youtube: YouTubeExtractor;
  logger: Logger;
  clock?: Clock;
  generateId?: IdGenerator;
}

/**
 * Composition root: the only place that knows concrete implementations.
 * Everything else depends on ports and receives collaborators through
 * constructor/factory injection.
 */
export async function createContainer(adapters: PlatformAdapters) {
  const {
    storage,
    picker,
    network,
    downloader,
    fileProcessor,
    engine,
    http,
    youtube,
    logger,
  } = adapters;
  const clock = adapters.clock ?? systemClock;
  const generateId = adapters.generateId ?? defaultGenerateId;
  const events = new EventBus();
  const db = await prepareDatabase(adapters.driver, logger);

  // Repositories
  const audioRepository = new SqliteAudioRepository(db);
  const collectionRepository = new SqliteCollectionRepository(db);
  const downloadRepository = new SqliteDownloadRepository(db);
  const progressRepository = new SqlitePlaybackProgressRepository(db);
  const historyRepository = new SqliteHistoryRepository(db);
  const keyValue = new SqliteKeyValueRepository(db, logger);

  // Services
  const settings = new SettingsService(keyValue, events, clock);
  const downloads = new DownloadManager({
    repository: downloadRepository,
    downloader,
    storage,
    network,
    events,
    clock,
    generateId,
    logger,
    getConfig: () => settings.get().downloads,
    urlResolver: new YouTubeMediaUrlResolver(youtube),
    fileProcessor,
  });
  const storageUseCases = createStorageUseCases({
    repository: downloadRepository,
    manager: downloads,
    storage,
    events,
    clock,
    logger,
    fileProcessor,
  });
  const player = new PlayerController({
    engine,
    audios: audioRepository,
    localFiles: storageUseCases,
    progress: progressRepository,
    history: historyRepository,
    session: new PlayerSessionRepository(keyValue, clock),
    network,
    events,
    clock,
    logger,
    getConfig: () => settings.get().playback,
  });

  const registry = new SourceProviderRegistry([
    new ArchiveOrgProvider(http),
    new YouTubeProvider(youtube, logger),
    new DirectAudioProvider(http, logger),
  ]);
  const importUnitOfWork = new SqliteUnitOfWork<ImportScope>(
    db,
    (executor: SqlExecutor) => ({
      audios: new SqliteAudioRepository(executor),
      collections: new SqliteCollectionRepository(executor),
    }),
  );

  const container = {
    events,
    logger,
    settings,
    downloads,
    downloadCommands: createDownloadCommands({
      manager: downloads,
      audios: audioRepository,
    }),
    player,
    storage: storageUseCases,
    audios: createAudioUseCases({
      audios: audioRepository,
      favorites: new SqliteFavoriteRepository(db),
      fileCleaner: downloads,
      playback: player,
      events,
      clock,
    }),
    collections: createCollectionUseCases({
      collections: collectionRepository,
      downloads,
      storage,
      picker,
      events,
      clock,
      generateId,
      logger,
    }),
    imports: createImportUseCases({
      registry,
      localSource: new LocalFileProvider(picker, storage),
      unitOfWork: importUnitOfWork,
      downloads,
      storage,
      events,
      clock,
      generateId,
      logger,
    }),
    progress: createProgressUseCases({
      progress: progressRepository,
      audios: audioRepository,
      events,
      clock,
    }),
    history: createHistoryUseCases({ history: historyRepository, events }),
    bookmarks: createBookmarkUseCases({
      bookmarks: new SqliteBookmarkRepository(db),
      events,
      clock,
      generateId,
    }),
    playlists: createPlaylistUseCases({
      playlists: new SqlitePlaylistRepository(db),
      events,
      clock,
      generateId,
    }),
    search: createSearchUseCases({ search: new SqliteLibrarySearchRepository(db) }),
    backup: createBackupUseCases({
      gateway: new SqliteBackupGateway(db, clock),
      storage,
      picker,
      settings,
      events,
      clock,
      logger,
    }),

    /** Loads persisted state and starts background services. */
    async start(): Promise<void> {
      await storage.ensureDirectories();
      await settings.load();
      settings.subscribe(() => {
        downloads
          .reschedule()
          .catch(error => logger.error('downloads.reschedule_failed', {}, error));
        player
          .applyConfig()
          .catch(error => logger.error('player.apply_config_failed', {}, error));
      });
      await downloads.start();
      await player.initialize();
      // Off the startup path: fixes files downloaded before processing existed.
      storageUseCases
        .processDownloadedFiles()
        .catch(error => logger.error('storage.processing_failed', {}, error));
    },

    async dispose(): Promise<void> {
      downloads.stop();
      player.dispose();
      await db.close();
    },
  };
  return container;
}

export type AppContainer = Awaited<ReturnType<typeof createContainer>>;
