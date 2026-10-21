import { TrackPlayerEngine } from '@infrastructure/audio/TrackPlayerEngine';
import { DATABASE_NAME } from '@infrastructure/database/openDatabase';
import { OpSqliteDriver } from '@infrastructure/database/OpSqliteDriver';
import { NativeFileDownloader } from '@infrastructure/downloads/NativeFileDownloader';
import { NativeMp4Remuxer } from '@infrastructure/downloads/NativeMp4Remuxer';
import { NativeYouTubeExtractor } from '@infrastructure/external-sources/youtube/NativeYouTubeExtractor';
import { NativeDocumentPicker } from '@infrastructure/filesystem/NativeDocumentPicker';
import { RnfsFileStorage } from '@infrastructure/filesystem/RnfsFileStorage';
import { FetchHttpClient } from '@infrastructure/http/FetchHttpClient';
import { ConsoleLogger } from '@infrastructure/logging/ConsoleLogger';
import { NetInfoNetworkMonitor } from '@infrastructure/network/NetInfoNetworkMonitor';
import type { PlatformAdapters } from '../dependency-injection/createContainer';

export function createProductionAdapters(): PlatformAdapters {
  const logger = new ConsoleLogger();
  return {
    driver: new OpSqliteDriver(DATABASE_NAME),
    storage: new RnfsFileStorage(),
    picker: new NativeDocumentPicker(logger),
    network: new NetInfoNetworkMonitor(),
    downloader: new NativeFileDownloader(),
    fileProcessor: new NativeMp4Remuxer(),
    engine: new TrackPlayerEngine(logger),
    http: new FetchHttpClient(),
    youtube: new NativeYouTubeExtractor(),
    logger,
  };
}
