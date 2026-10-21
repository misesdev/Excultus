import { z } from 'zod';
import type { Logger } from '@core/application';
import { InvalidSourceUrlError } from '@core/errors';
import { parseHttpsUrl, pathSegments } from '@core/utils';
import type {
  AudioSourceProvider,
  SourceAudioItem,
  SourceMetadata,
} from '@features/imports';
import type { HttpClient } from '../../http/HttpClient';

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
];
const SHORT_HOST = 'youtu.be';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

const oembedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
  thumbnail_url: z.string().optional(),
});

export type YouTubeReference =
  | { kind: 'video'; id: string }
  | { kind: 'playlist'; id: string };

export function parseYouTubeUrl(url: string): YouTubeReference | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed) {
    return null;
  }
  const segments = pathSegments(parsed.pathname);
  if (parsed.host === SHORT_HOST) {
    const id = segments[0];
    return id && VIDEO_ID.test(id) ? { kind: 'video', id } : null;
  }
  if (!YOUTUBE_HOSTS.includes(parsed.host)) {
    return null;
  }
  const video = parsed.query.v;
  if (
    (segments[0] === 'watch' || segments.length === 0) &&
    video &&
    VIDEO_ID.test(video)
  ) {
    return { kind: 'video', id: video };
  }
  if (
    (segments[0] === 'shorts' || segments[0] === 'live') &&
    segments[1] &&
    VIDEO_ID.test(segments[1])
  ) {
    return { kind: 'video', id: segments[1] };
  }
  const list = parsed.query.list;
  if (segments[0] === 'playlist' && list && LIST_ID.test(list)) {
    return { kind: 'playlist', id: list };
  }
  return null;
}

function canonicalUrl(reference: YouTubeReference): string {
  return reference.kind === 'video'
    ? `https://www.youtube.com/watch?v=${reference.id}`
    : `https://www.youtube.com/playlist?list=${reference.id}`;
}

/**
 * Stores links and public metadata (official oEmbed endpoint) for YouTube
 * videos and playlists. By design there is NO audio extraction: playback
 * happens on YouTube itself, respecting the platform's terms.
 */
export class YouTubeMetadataProvider implements AudioSourceProvider {
  readonly id = 'youtube';
  readonly label = 'YouTube (link e metadados)';

  constructor(private readonly http: HttpClient, private readonly logger: Logger) {}

  canHandle(url: string): boolean {
    return parseYouTubeUrl(url) !== null;
  }

  async getMetadata(url: string): Promise<SourceMetadata> {
    const reference = this.requireReference(url);
    const link = canonicalUrl(reference);
    const fallbackTitle =
      reference.kind === 'video' ? 'Vídeo do YouTube' : 'Playlist do YouTube';
    try {
      const oembed = await this.http.getJson(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`,
        oembedSchema,
      );
      return {
        sourceType: 'youtube',
        sourceId: `${reference.kind}:${reference.id}`,
        title: oembed.title || fallbackTitle,
        creator: oembed.author_name,
        artworkUrl:
          oembed.thumbnail_url && parseHttpsUrl(oembed.thumbnail_url)
            ? oembed.thumbnail_url
            : undefined,
        originalUrl: link,
      };
    } catch (error) {
      // Private/unlisted content has no oEmbed data; the link itself is still valid.
      this.logger.warn('youtube.oembed_unavailable', { kind: reference.kind }, error);
      return {
        sourceType: 'youtube',
        sourceId: `${reference.kind}:${reference.id}`,
        title: fallbackTitle,
        originalUrl: link,
      };
    }
  }

  async getAudioItems(url: string): Promise<SourceAudioItem[]> {
    const reference = this.requireReference(url);
    const metadata = await this.getMetadata(url);
    return [
      {
        sourceId: `${reference.kind}:${reference.id}`,
        title: metadata.title,
        artist: metadata.creator,
        sourceUrl: metadata.originalUrl,
        availability: 'external',
        acquisition: { kind: 'link-only' },
      },
    ];
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
