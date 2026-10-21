import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/** Sizes/durations are doubles (JS numbers); -1 means "unknown". */
export type YouTubeVideoInfo = {
  id: string;
  title: string;
  uploader: string;
  durationSeconds: number;
  thumbnailUrl: string;
  /** Short-lived (hours) progressive audio URL; resolve again before each transfer. */
  streamUrl: string;
  mimeType: string;
  contentLength: number;
};

export type YouTubePlaylistEntry = {
  id: string;
  title: string;
  uploader: string;
  durationSeconds: number;
};

export type YouTubePlaylistInfo = {
  id: string;
  title: string;
  uploader: string;
  thumbnailUrl: string;
  entries: YouTubePlaylistEntry[];
  /** True when the playlist has more entries than `maxEntries`. */
  truncated: boolean;
};

/**
 * Rejection codes: E_UNAVAILABLE (private, removed, age/region restricted),
 * E_NO_AUDIO (no downloadable audio stream), E_NETWORK, E_EXTRACTION.
 */
export interface Spec extends TurboModule {
  resolveVideo(videoId: string): Promise<YouTubeVideoInfo>;
  getPlaylist(playlistId: string, maxEntries: number): Promise<YouTubePlaylistInfo>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ExcultusYouTube');
