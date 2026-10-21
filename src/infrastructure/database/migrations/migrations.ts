export interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

const DOWNLOAD_STATUSES =
  "'queued','downloading','paused','completed','failed','cancelled'";

/**
 * Versioned, append-only schema migrations. Never edit a released migration;
 * add a new one with the next version number instead.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    statements: [
      `CREATE TABLE collections (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        description TEXT,
        artwork_path TEXT,
        sort_mode TEXT NOT NULL DEFAULT 'custom'
          CHECK (sort_mode IN ('custom', 'title', 'addedAt', 'duration')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_collections_name ON collections (name COLLATE NOCASE)',

      `CREATE TABLE audios (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        description TEXT,
        artist TEXT,
        album TEXT,
        duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms > 0),
        artwork_path TEXT,
        source_type TEXT NOT NULL CHECK (source_type IN ('archive', 'youtube', 'local', 'direct')),
        source_id TEXT,
        source_url TEXT,
        media_url TEXT,
        mime_type TEXT,
        file_size INTEGER CHECK (file_size IS NULL OR file_size > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (source_type, source_id)
      )`,
      'CREATE INDEX idx_audios_title ON audios (title COLLATE NOCASE)',
      'CREATE INDEX idx_audios_created_at ON audios (created_at)',
      'CREATE INDEX idx_audios_duration ON audios (duration_ms)',

      `CREATE TABLE collection_audios (
        collection_id TEXT NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
        audio_id TEXT NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position >= 0),
        added_at TEXT NOT NULL,
        PRIMARY KEY (collection_id, audio_id)
      )`,
      'CREATE INDEX idx_collection_audios_order ON collection_audios (collection_id, position)',
      'CREATE INDEX idx_collection_audios_audio ON collection_audios (audio_id)',

      `CREATE TABLE playlists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE playlist_audios (
        playlist_id TEXT NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
        audio_id TEXT NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position >= 0),
        added_at TEXT NOT NULL,
        PRIMARY KEY (playlist_id, audio_id)
      )`,
      'CREATE INDEX idx_playlist_audios_order ON playlist_audios (playlist_id, position)',
      'CREATE INDEX idx_playlist_audios_audio ON playlist_audios (audio_id)',

      `CREATE TABLE playback_progress (
        audio_id TEXT PRIMARY KEY NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        position_ms INTEGER NOT NULL CHECK (position_ms >= 0),
        duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms > 0),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        last_played_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_progress_last_played ON playback_progress (last_played_at)',

      `CREATE TABLE downloads (
        id TEXT PRIMARY KEY NOT NULL,
        audio_id TEXT NOT NULL UNIQUE REFERENCES audios (id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN (${DOWNLOAD_STATUSES})),
        bytes_downloaded INTEGER NOT NULL DEFAULT 0 CHECK (bytes_downloaded >= 0),
        total_bytes INTEGER CHECK (total_bytes IS NULL OR total_bytes >= 0),
        expected_md5 TEXT,
        file_extension TEXT NOT NULL,
        temp_path TEXT NOT NULL,
        local_path TEXT,
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        error_code TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        verified_at TEXT,
        CHECK (status <> 'completed' OR local_path IS NOT NULL)
      )`,
      'CREATE INDEX idx_downloads_status ON downloads (status, created_at)',

      `CREATE TABLE bookmarks (
        id TEXT PRIMARY KEY NOT NULL,
        audio_id TEXT NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        position_ms INTEGER NOT NULL CHECK (position_ms >= 0),
        title TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX idx_bookmarks_audio ON bookmarks (audio_id, position_ms)',
      'CREATE INDEX idx_bookmarks_created ON bookmarks (created_at)',

      `CREATE TABLE favorites (
        audio_id TEXT PRIMARY KEY NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE playback_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audio_id TEXT NOT NULL REFERENCES audios (id) ON DELETE CASCADE,
        played_at TEXT NOT NULL,
        position_ms INTEGER NOT NULL DEFAULT 0 CHECK (position_ms >= 0)
      )`,
      'CREATE INDEX idx_history_played_at ON playback_history (played_at)',
      'CREATE INDEX idx_history_audio ON playback_history (audio_id)',

      `CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Full-text index. It stores its own copy keyed by audio_id (instead of
      // external content bound to the implicit rowid, which VACUUM may change).
      `CREATE VIRTUAL TABLE audios_fts USING fts5(
        audio_id UNINDEXED, title, artist, album, description,
        tokenize = 'unicode61 remove_diacritics 2'
      )`,
      `CREATE TRIGGER audios_fts_insert AFTER INSERT ON audios BEGIN
        INSERT INTO audios_fts (audio_id, title, artist, album, description)
        VALUES (new.id, new.title, new.artist, new.album, new.description);
      END`,
      `CREATE TRIGGER audios_fts_delete AFTER DELETE ON audios BEGIN
        DELETE FROM audios_fts WHERE audio_id = old.id;
      END`,
      `CREATE TRIGGER audios_fts_update AFTER UPDATE OF title, artist, album, description ON audios BEGIN
        DELETE FROM audios_fts WHERE audio_id = old.id;
        INSERT INTO audios_fts (audio_id, title, artist, album, description)
        VALUES (new.id, new.title, new.artist, new.album, new.description);
      END`,
    ],
  },
  {
    version: 2,
    name: 'downloadable_youtube_videos',
    statements: [
      // Videos imported when YouTube was link-only become downloadable: the
      // page URL is resolved to a media URL right before each download.
      `UPDATE audios
        SET media_url = source_url, mime_type = 'audio/mp4'
        WHERE source_type = 'youtube' AND source_id LIKE 'video:%'
          AND media_url IS NULL AND source_url IS NOT NULL`,
    ],
  },
];
