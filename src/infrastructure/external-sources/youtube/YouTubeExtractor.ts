export interface YouTubeVideo {
  id: string;
  title: string;
  uploader?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  /** Short-lived (hours) progressive audio URL. */
  streamUrl: string;
  mimeType: string;
  contentLength?: number;
}

export interface YouTubePlaylistEntry {
  id: string;
  title: string;
  uploader?: string;
  durationMs?: number;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  uploader?: string;
  thumbnailUrl?: string;
  entries: YouTubePlaylistEntry[];
  /** The playlist has more entries than were requested. */
  truncated: boolean;
}

/**
 * Port over the native YouTube resolver. Failures are AppErrors: `network`
 * for connectivity problems, `source-unavailable`/`unsupported-format` when
 * the video cannot be downloaded.
 */
export interface YouTubeExtractor {
  resolveVideo(videoId: string): Promise<YouTubeVideo>;
  getPlaylist(playlistId: string, maxEntries: number): Promise<YouTubePlaylist>;
}
