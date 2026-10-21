import type {
  Clock,
  DocumentPicker,
  EventBus,
  FileStorage,
  Logger,
} from '@core/application';
import type { SettingsService } from './SettingsService';

export type BackupScope =
  /** Everything needed to rebuild the library (except audio files). */
  | 'full'
  /** Catalog only: audios, collections and their relationships. */
  | 'metadata';

export interface RestoreReport {
  audios: number;
  collections: number;
  playlists: number;
}

/** Serializes and restores persisted data; validation lives in the implementation. */
export interface BackupGateway {
  export(scope: BackupScope): Promise<string>;
  restore(serialized: string): Promise<RestoreReport>;
}

export interface BackupUseCaseDeps {
  gateway: BackupGateway;
  storage: FileStorage;
  picker: DocumentPicker;
  settings: SettingsService;
  events: EventBus;
  clock: Clock;
  logger: Logger;
}

const JSON_MIME = 'application/json';

export function createBackupUseCases(deps: BackupUseCaseDeps) {
  const { gateway, storage, picker, settings, events, clock, logger } = deps;

  return {
    /** Returns false when the user dismissed the save dialog. */
    async export(scope: BackupScope): Promise<boolean> {
      const content = await gateway.export(scope);
      const stamp = clock.nowIso().slice(0, 10);
      const fileName =
        scope === 'full'
          ? `excultus-backup-${stamp}.json`
          : `excultus-metadados-${stamp}.json`;
      const path = storage.exportFilePath(fileName);
      await storage.writeText(path, content);
      try {
        const saved = await picker.saveFileAs(path, fileName, JSON_MIME);
        logger.info('backup.export', { scope, saved });
        return saved;
      } finally {
        await storage.remove(path);
      }
    },

    /** Returns null when the user dismissed the picker. */
    async restore(): Promise<RestoreReport | null> {
      const picked = await picker.pickJsonFile();
      if (!picked) {
        return null;
      }
      try {
        const content = await storage.readText(picked.localPath);
        const report = await gateway.restore(content);
        await settings.load();
        events.emit(
          'library',
          'collections',
          'playlists',
          'bookmarks',
          'history',
          'downloads',
        );
        logger.info('backup.restore', { ...report });
        return report;
      } finally {
        await storage.remove(picked.localPath);
      }
    },
  };
}

export type BackupUseCases = ReturnType<typeof createBackupUseCases>;
