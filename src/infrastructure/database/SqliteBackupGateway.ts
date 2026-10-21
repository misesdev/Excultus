import { z } from 'zod';
import type { Clock } from '@core/application';
import { ValidationError } from '@core/errors';
import type { BackupGateway, BackupScope, RestoreReport } from '@features/settings';
import { getSchemaVersion } from './migrations/migrator';
import type { SqlDatabase, SqlExecutor, SqlRow, SqlValue } from './SqlDatabase';

const BACKUP_FORMAT = 'excultus-backup';
const BACKUP_VERSION = 1;
/** Session/runtime keys are device-specific and never exported. */
const EXCLUDED_SETTING_KEYS = ['player.session'];

const text = z.string().max(20000);
const optionalText = text.nullable().optional();
const optionalInt = z.number().int().nonnegative().nullable().optional();

const collectionSchema = z.object({
  id: text,
  name: text.min(1),
  description: optionalText,
  artwork_path: optionalText,
  sort_mode: z.enum(['custom', 'title', 'addedAt', 'duration']),
  created_at: text,
  updated_at: text,
});
const audioSchema = z.object({
  id: text,
  title: text.min(1),
  description: optionalText,
  artist: optionalText,
  album: optionalText,
  duration_ms: z.number().int().positive().nullable().optional(),
  artwork_path: optionalText,
  source_type: z.enum(['archive', 'youtube', 'local', 'direct']),
  source_id: optionalText,
  source_url: optionalText,
  media_url: optionalText,
  mime_type: optionalText,
  file_size: z.number().int().positive().nullable().optional(),
  created_at: text,
  updated_at: text,
});
const position = z.number().int().nonnegative();
const collectionAudioSchema = z.object({
  collection_id: text,
  audio_id: text,
  position,
  added_at: text,
});
const playlistAudioSchema = z.object({
  playlist_id: text,
  audio_id: text,
  position,
  added_at: text,
});
const playlistSchema = z.object({
  id: text,
  name: text.min(1),
  description: optionalText,
  created_at: text,
  updated_at: text,
});
const progressSchema = z.object({
  audio_id: text,
  position_ms: z.number().int().nonnegative(),
  duration_ms: z.number().int().positive().nullable().optional(),
  completed: z.union([z.literal(0), z.literal(1)]),
  last_played_at: text,
});
const bookmarkSchema = z.object({
  id: text,
  audio_id: text,
  position_ms: z.number().int().nonnegative(),
  title: optionalText,
  note: optionalText,
  created_at: text,
});
const favoriteSchema = z.object({ audio_id: text, created_at: text });
const historySchema = z.object({
  audio_id: text,
  played_at: text,
  position_ms: optionalInt,
});
const settingSchema = z.object({ key: text, value: text, updated_at: text });

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  scope: z.enum(['full', 'metadata']),
  exportedAt: text,
  data: z.object({
    collections: z.array(collectionSchema),
    audios: z.array(audioSchema),
    collection_audios: z.array(collectionAudioSchema),
    playlists: z.array(playlistSchema).default([]),
    playlist_audios: z.array(playlistAudioSchema).default([]),
    playback_progress: z.array(progressSchema).default([]),
    bookmarks: z.array(bookmarkSchema).default([]),
    favorites: z.array(favoriteSchema).default([]),
    playback_history: z.array(historySchema).default([]),
    settings: z.array(settingSchema).default([]),
  }),
});

type BackupData = z.infer<typeof backupSchema>['data'];

const FULL_TABLES = [
  'collections',
  'audios',
  'collection_audios',
  'playlists',
  'playlist_audios',
  'playback_progress',
  'bookmarks',
  'favorites',
  'playback_history',
  'settings',
] as const;
const METADATA_TABLES = ['collections', 'audios', 'collection_audios'] as const;

function insertSql(table: string, columns: readonly string[], conflict: string): string {
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns
    .map(() => '?')
    .join(', ')}) ${conflict}`;
}

function values(row: Record<string, unknown>, columns: readonly string[]): SqlValue[] {
  return columns.map(column => {
    const value = row[column];
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  });
}

/**
 * JSON backup of the library metadata. Audio files are not included; on
 * restore, audios merge with existing ones by source identity, so restoring
 * twice never duplicates records.
 */
export class SqliteBackupGateway implements BackupGateway {
  constructor(private readonly db: SqlDatabase, private readonly clock: Clock) {}

  async export(scope: BackupScope): Promise<string> {
    const tables = scope === 'full' ? FULL_TABLES : METADATA_TABLES;
    const data: Record<string, SqlRow[]> = {};
    for (const table of tables) {
      const { rows } = await this.db.execute(`SELECT * FROM ${table}`);
      data[table] =
        table === 'settings'
          ? rows.filter(row => !EXCLUDED_SETTING_KEYS.includes(String(row.key)))
          : table === 'playback_history'
          ? rows.map(({ id: _id, ...rest }) => rest)
          : rows;
    }
    return JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      scope,
      schemaVersion: await getSchemaVersion(this.db),
      exportedAt: this.clock.nowIso(),
      data,
    });
  }

  async restore(serialized: string): Promise<RestoreReport> {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(serialized);
    } catch (error) {
      throw new ValidationError('Backup file is not valid JSON', 'backup', {
        cause: error,
      });
    }
    const parsed = backupSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new ValidationError('Backup file has an unexpected format', 'backup', {
        details: { issue: parsed.error.issues[0]?.message },
      });
    }
    const data = parsed.data.data;
    await this.db.transaction(tx => this.restoreData(tx, data));
    return {
      audios: data.audios.length,
      collections: data.collections.length,
      playlists: data.playlists.length,
    };
  }

  private async restoreData(tx: SqlExecutor, data: BackupData): Promise<void> {
    const audioIds = await this.restoreAudios(tx, data.audios);
    const mapAudio = (id: string) => audioIds.get(id) ?? id;

    const collectionColumns = Object.keys(collectionSchema.shape);
    for (const row of data.collections) {
      await tx.execute(
        insertSql(
          'collections',
          collectionColumns,
          `ON CONFLICT (id) DO UPDATE SET name = excluded.name,
          description = excluded.description, sort_mode = excluded.sort_mode, updated_at = excluded.updated_at`,
        ),
        values(row, collectionColumns),
      );
    }
    const playlistColumns = Object.keys(playlistSchema.shape);
    for (const row of data.playlists) {
      await tx.execute(
        insertSql(
          'playlists',
          playlistColumns,
          `ON CONFLICT (id) DO UPDATE SET name = excluded.name,
          description = excluded.description, updated_at = excluded.updated_at`,
        ),
        values(row, playlistColumns),
      );
    }
    for (const row of data.collection_audios) {
      await tx.execute(
        `INSERT INTO collection_audios (collection_id, audio_id, position, added_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (collection_id, audio_id) DO NOTHING`,
        [row.collection_id, mapAudio(row.audio_id), row.position, row.added_at],
      );
    }
    for (const row of data.playlist_audios) {
      await tx.execute(
        `INSERT INTO playlist_audios (playlist_id, audio_id, position, added_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (playlist_id, audio_id) DO NOTHING`,
        [row.playlist_id, mapAudio(row.audio_id), row.position, row.added_at],
      );
    }
    for (const row of data.playback_progress) {
      await tx.execute(
        `INSERT INTO playback_progress (audio_id, position_ms, duration_ms, completed, last_played_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (audio_id) DO UPDATE SET position_ms = excluded.position_ms,
           completed = excluded.completed, last_played_at = excluded.last_played_at
         WHERE excluded.last_played_at > playback_progress.last_played_at`,
        [
          mapAudio(row.audio_id),
          row.position_ms,
          row.duration_ms ?? null,
          row.completed,
          row.last_played_at,
        ],
      );
    }
    for (const row of data.bookmarks) {
      await tx.execute(
        `INSERT INTO bookmarks (id, audio_id, position_ms, title, note, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          mapAudio(row.audio_id),
          row.position_ms,
          row.title ?? null,
          row.note ?? null,
          row.created_at,
        ],
      );
    }
    for (const row of data.favorites) {
      await tx.execute(
        'INSERT INTO favorites (audio_id, created_at) VALUES (?, ?) ON CONFLICT (audio_id) DO NOTHING',
        [mapAudio(row.audio_id), row.created_at],
      );
    }
    for (const row of data.playback_history) {
      await tx.execute(
        `INSERT INTO playback_history (audio_id, played_at, position_ms)
         SELECT ?, ?, ? WHERE NOT EXISTS
           (SELECT 1 FROM playback_history WHERE audio_id = ? AND played_at = ?)`,
        [
          mapAudio(row.audio_id),
          row.played_at,
          row.position_ms ?? 0,
          mapAudio(row.audio_id),
          row.played_at,
        ],
      );
    }
    for (const row of data.settings) {
      if (EXCLUDED_SETTING_KEYS.includes(row.key)) {
        continue;
      }
      await tx.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [row.key, row.value, row.updated_at],
      );
    }
  }

  /** Inserts audios, reusing existing records with the same source identity. */
  private async restoreAudios(
    tx: SqlExecutor,
    audios: BackupData['audios'],
  ): Promise<Map<string, string>> {
    const idMap = new Map<string, string>();
    const columns = Object.keys(audioSchema.shape);
    for (const row of audios) {
      if (row.source_id) {
        const { rows } = await tx.execute(
          'SELECT id FROM audios WHERE source_type = ? AND source_id = ?',
          [row.source_type, row.source_id],
        );
        const existingId = rows[0]?.id;
        if (typeof existingId === 'string') {
          idMap.set(row.id, existingId);
          continue;
        }
      }
      await tx.execute(
        insertSql('audios', columns, 'ON CONFLICT (id) DO NOTHING'),
        values(row, columns),
      );
      idMap.set(row.id, row.id);
    }
    return idMap;
  }
}
