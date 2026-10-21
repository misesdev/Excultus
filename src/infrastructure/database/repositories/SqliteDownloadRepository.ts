import type {
  Download,
  DownloadErrorCode,
  DownloadListEntry,
  DownloadRepository,
  DownloadStatus,
} from '@features/downloads';
import {
  placeholders,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
  toSql,
} from '../rowReaders';
import type { SqlExecutor, SqlRow } from '../SqlDatabase';

function mapDownload(row: SqlRow): Download {
  return {
    id: readString(row, 'id'),
    audioId: readString(row, 'audio_id'),
    url: readString(row, 'url'),
    status: readString(row, 'status') as DownloadStatus,
    bytesDownloaded: readNumber(row, 'bytes_downloaded'),
    totalBytes: readOptionalNumber(row, 'total_bytes'),
    expectedMd5: readOptionalString(row, 'expected_md5'),
    fileExtension: readString(row, 'file_extension'),
    tempPath: readString(row, 'temp_path'),
    localPath: readOptionalString(row, 'local_path'),
    attempts: readNumber(row, 'attempts'),
    errorCode: readOptionalString(row, 'error_code') as DownloadErrorCode | undefined,
    errorMessage: readOptionalString(row, 'error_message'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    verifiedAt: readOptionalString(row, 'verified_at'),
  };
}

export class SqliteDownloadRepository implements DownloadRepository {
  constructor(private readonly db: SqlExecutor) {}

  async findById(id: string): Promise<Download | null> {
    const { rows } = await this.db.execute('SELECT * FROM downloads WHERE id = ?', [id]);
    return rows[0] ? mapDownload(rows[0]) : null;
  }

  async findByAudioId(audioId: string): Promise<Download | null> {
    const { rows } = await this.db.execute('SELECT * FROM downloads WHERE audio_id = ?', [
      audioId,
    ]);
    return rows[0] ? mapDownload(rows[0]) : null;
  }

  async findByStatus(statuses: readonly DownloadStatus[]): Promise<Download[]> {
    if (statuses.length === 0) {
      return [];
    }
    const { rows } = await this.db.execute(
      `SELECT * FROM downloads WHERE status IN (${placeholders(
        statuses.length,
      )}) ORDER BY created_at ASC`,
      statuses,
    );
    return rows.map(mapDownload);
  }

  async save(download: Download): Promise<void> {
    await this.db.execute(
      `INSERT INTO downloads (id, audio_id, url, status, bytes_downloaded, total_bytes, expected_md5,
         file_extension, temp_path, local_path, attempts, error_code, error_message,
         created_at, updated_at, completed_at, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         url = excluded.url, status = excluded.status, bytes_downloaded = excluded.bytes_downloaded,
         total_bytes = excluded.total_bytes, expected_md5 = excluded.expected_md5,
         file_extension = excluded.file_extension, temp_path = excluded.temp_path,
         local_path = excluded.local_path, attempts = excluded.attempts,
         error_code = excluded.error_code, error_message = excluded.error_message,
         updated_at = excluded.updated_at, completed_at = excluded.completed_at,
         verified_at = excluded.verified_at`,
      [
        download.id,
        download.audioId,
        download.url,
        download.status,
        download.bytesDownloaded,
        toSql(download.totalBytes),
        toSql(download.expectedMd5),
        download.fileExtension,
        download.tempPath,
        toSql(download.localPath),
        download.attempts,
        toSql(download.errorCode),
        toSql(download.errorMessage),
        download.createdAt,
        download.updatedAt,
        toSql(download.completedAt),
        toSql(download.verifiedAt),
      ],
    );
  }

  async updateProgress(
    id: string,
    bytesDownloaded: number,
    totalBytes: number | undefined,
    nowIso: string,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE downloads SET bytes_downloaded = ?, total_bytes = COALESCE(total_bytes, ?), updated_at = ?
       WHERE id = ? AND status = 'downloading'`,
      [bytesDownloaded, toSql(totalBytes), nowIso, id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM downloads WHERE id = ?', [id]);
  }

  async listEntries(): Promise<DownloadListEntry[]> {
    const { rows } = await this.db.execute(
      `SELECT d.*, a.title AS audio_title, a.artwork_path AS audio_artwork
       FROM downloads d JOIN audios a ON a.id = d.audio_id
       WHERE d.status <> 'cancelled'
       ORDER BY CASE d.status WHEN 'downloading' THEN 0 WHEN 'queued' THEN 1 WHEN 'paused' THEN 2
                              WHEN 'failed' THEN 3 ELSE 4 END,
                COALESCE(d.completed_at, d.created_at) DESC`,
    );
    return rows.map(row => ({
      download: mapDownload(row),
      title: readString(row, 'audio_title'),
      artworkPath: readOptionalString(row, 'audio_artwork'),
    }));
  }

  async completedSizeBytes(): Promise<number> {
    const { rows } = await this.db.execute(
      "SELECT COALESCE(SUM(bytes_downloaded), 0) AS total FROM downloads WHERE status = 'completed'",
    );
    return rows[0] ? readNumber(rows[0], 'total') : 0;
  }
}
