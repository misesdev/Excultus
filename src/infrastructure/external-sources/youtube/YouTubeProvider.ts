import type { Logger } from '@core/application';
import { AppError, InvalidSourceUrlError, SourceUnavailableError } from '@core/errors';
import type {
  AudioSourceProvider,
  SourceAudioItem,
  SourceMetadata,
} from '@features/imports';
import type { YouTubeExtractor, YouTubeVideo } from './YouTubeExtractor';
import {
  parseYouTubeUrl,
  youTubePlaylistUrl,
  youTubeWatchUrl,
  type YouTubeReference,
} from './youtubeUrl';

/** Playlist entries checked per import; each one costs a resolution request. */
export const MAX_PLAYLIST_ENTRIES = 200;
const RESOLVE_CONCURRENCY = 4;
const M4A_MIME = 'audio/mp4';

interface ResolvedSource {
  metadata: SourceMetadata;
  items: SourceAudioItem[];
}

/** Runs `task` over `items` with at most `limit` in flight, keeping order. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index] as T);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function downloadableItem(video: YouTubeVideo): SourceAudioItem {
  const page = youTubeWatchUrl(video.id);
  return {
    sourceId: `video:${video.id}`,
    title: video.title,
    artist: video.uploader,
    durationMs: video.durationMs,
    sizeBytes: video.contentLength,
    mimeType: M4A_MIME,
    fileExtension: 'm4a',
    sourceUrl: page,
    // The page URL is stored; the expiring media URL is resolved per download.
    mediaUrl: page,
    availability: 'available',
    acquisition: { kind: 'download', url: page },
  };
}

/**
 * Imports YouTube videos and playlists as downloaded M4A audio. Every video
 * is resolved during the preview, so nothing that cannot be downloaded is
 * ever saved: a single unavailable video fails the import, and unavailable
 * playlist entries are listed as restricted.
 */
export class YouTubeProvider implements AudioSourceProvider {
  readonly id = 'youtube';
  readonly label = 'YouTube';
  private cached?: { url: string; result: Promise<ResolvedSource> };

  constructor(
    private readonly extractor: YouTubeExtractor,
    private readonly logger: Logger,
  ) {}

  canHandle(url: string): boolean {
    return parseYouTubeUrl(url) !== null;
  }

  async getMetadata(url: string): Promise<SourceMetadata> {
    return (await this.resolve(url)).metadata;
  }

  async getAudioItems(url: string): Promise<SourceAudioItem[]> {
    const { items } = await this.resolve(url);
    this.cached = undefined; // A later preview of the same link resolves it fresh.
    return items;
  }

  /** The import flow asks for metadata and then items: resolve only once. */
  private resolve(url: string): Promise<ResolvedSource> {
    if (this.cached?.url === url) {
      return this.cached.result;
    }
    const reference = this.requireReference(url);
    const result =
      reference.kind === 'video'
        ? this.resolveVideo(reference.id)
        : this.resolvePlaylist(reference.id);
    const cached = { url, result };
    this.cached = cached;
    result.catch(() => {
      if (this.cached === cached) {
        this.cached = undefined; // Let the user retry after a failure.
      }
    });
    return result;
  }

  private async resolveVideo(videoId: string): Promise<ResolvedSource> {
    const video = await this.extractor.resolveVideo(videoId);
    return {
      metadata: {
        sourceType: 'youtube',
        sourceId: `video:${video.id}`,
        title: video.title,
        creator: video.uploader,
        artworkUrl: video.thumbnailUrl,
        originalUrl: youTubeWatchUrl(video.id),
      },
      items: [downloadableItem(video)],
    };
  }

  private async resolvePlaylist(playlistId: string): Promise<ResolvedSource> {
    const playlist = await this.extractor.getPlaylist(playlistId, MAX_PLAYLIST_ENTRIES);
    const entries = [
      ...new Map(playlist.entries.map(entry => [entry.id, entry])).values(),
    ];
    const items = await mapWithConcurrency(
      entries,
      RESOLVE_CONCURRENCY,
      async (entry): Promise<SourceAudioItem> => {
        try {
          return downloadableItem(await this.extractor.resolveVideo(entry.id));
        } catch (error) {
          if (error instanceof AppError && error.code === 'network') {
            throw error;
          }
          this.logger.warn('youtube.entry_unavailable', { videoId: entry.id }, error);
          return {
            sourceId: `video:${entry.id}`,
            title: entry.title,
            artist: entry.uploader,
            durationMs: entry.durationMs,
            sourceUrl: youTubeWatchUrl(entry.id),
            availability: 'restricted',
            acquisition: { kind: 'none' },
          };
        }
      },
    );
    if (!items.some(item => item.availability === 'available')) {
      throw new SourceUnavailableError('No downloadable video in playlist', {
        details: { playlistId },
        userMessage: 'Nenhum vídeo desta playlist tem áudio disponível para download.',
      });
    }
    if (playlist.truncated) {
      this.logger.info('youtube.playlist_truncated', { max: MAX_PLAYLIST_ENTRIES });
    }
    return {
      metadata: {
        sourceType: 'youtube',
        sourceId: `playlist:${playlist.id}`,
        title: playlist.title,
        creator: playlist.uploader,
        artworkUrl: playlist.thumbnailUrl,
        originalUrl: youTubePlaylistUrl(playlist.id),
      },
      items,
    };
  }

  private requireReference(url: string): YouTubeReference {
    const reference = parseYouTubeUrl(url);
    if (!reference) {
      throw new InvalidSourceUrlError('Not a YouTube video or playlist URL', {
        details: { url },
      });
    }
    return reference;
  }
}
