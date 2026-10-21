import type { Audio, AudioLibraryItem, OfflineState, SourceType } from '@features/audios';
import {
  readBoolean,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
  toSql,
} from '../rowReaders';
import type { SqlRow, SqlValue } from '../SqlDatabase';

export const AUDIO_COLUMNS = `a.id, a.title, a.description, a.artist, a.album, a.duration_ms,
  a.artwork_path, a.source_type, a.source_id, a.source_url, a.media_url, a.mime_type,
  a.file_size, a.created_at, a.updated_at`;

/** Columns + joins that compose an AudioLibraryItem (shared by every list query). */
export const LIBRARY_ITEM_SELECT = `SELECT ${AUDIO_COLUMNS},
  d.status AS d_status, d.local_path AS d_local_path,
  p.position_ms AS p_position_ms, p.duration_ms AS p_duration_ms,
  p.completed AS p_completed, p.last_played_at AS p_last_played_at,
  CASE WHEN f.audio_id IS NULL THEN 0 ELSE 1 END AS is_favorite
FROM audios a
LEFT JOIN downloads d ON d.audio_id = a.id
LEFT JOIN playback_progress p ON p.audio_id = a.id
LEFT JOIN favorites f ON f.audio_id = a.id`;

export function mapAudio(row: SqlRow): Audio {
  return {
    id: readString(row, 'id'),
    title: readString(row, 'title'),
    description: readOptionalString(row, 'description'),
    artist: readOptionalString(row, 'artist'),
    album: readOptionalString(row, 'album'),
    durationMs: readOptionalNumber(row, 'duration_ms'),
    artworkPath: readOptionalString(row, 'artwork_path'),
    sourceType: readString(row, 'source_type') as SourceType,
    sourceId: readOptionalString(row, 'source_id'),
    sourceUrl: readOptionalString(row, 'source_url'),
    mediaUrl: readOptionalString(row, 'media_url'),
    mimeType: readOptionalString(row, 'mime_type'),
    fileSize: readOptionalNumber(row, 'file_size'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

const OFFLINE_BY_STATUS: Record<string, OfflineState> = {
  queued: 'queued',
  downloading: 'downloading',
  paused: 'paused',
  failed: 'failed',
  cancelled: 'not-downloaded',
  completed: 'available',
};

export function mapLibraryItem(row: SqlRow): AudioLibraryItem {
  const status = readOptionalString(row, 'd_status');
  const offline = status
    ? OFFLINE_BY_STATUS[status] ?? 'not-downloaded'
    : 'not-downloaded';
  const lastPlayedAt = readOptionalString(row, 'p_last_played_at');
  return {
    audio: mapAudio(row),
    offline,
    localPath:
      offline === 'available' ? readOptionalString(row, 'd_local_path') : undefined,
    progress: lastPlayedAt
      ? {
          positionMs: readNumber(row, 'p_position_ms'),
          durationMs: readOptionalNumber(row, 'p_duration_ms'),
          completed: readBoolean(row, 'p_completed'),
          lastPlayedAt,
        }
      : undefined,
    isFavorite: readBoolean(row, 'is_favorite'),
  };
}

export function audioToParams(audio: Audio): SqlValue[] {
  return [
    audio.id,
    audio.title,
    toSql(audio.description),
    toSql(audio.artist),
    toSql(audio.album),
    toSql(audio.durationMs),
    toSql(audio.artworkPath),
    audio.sourceType,
    toSql(audio.sourceId),
    toSql(audio.sourceUrl),
    toSql(audio.mediaUrl),
    toSql(audio.mimeType),
    toSql(audio.fileSize),
    audio.createdAt,
    audio.updatedAt,
  ];
}
