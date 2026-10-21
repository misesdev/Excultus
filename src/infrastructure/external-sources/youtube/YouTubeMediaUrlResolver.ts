import type { MediaUrlResolver, ResolvedMediaUrl } from '@features/downloads';
import type { YouTubeExtractor } from './YouTubeExtractor';
import { parseYouTubeUrl } from './youtubeUrl';

/**
 * YouTube downloads store the video page URL; the expiring media URL is
 * resolved right before each transfer. Other URLs pass through unchanged.
 */
export class YouTubeMediaUrlResolver implements MediaUrlResolver {
  constructor(private readonly extractor: YouTubeExtractor) {}

  async resolve(url: string): Promise<ResolvedMediaUrl> {
    const reference = parseYouTubeUrl(url);
    if (reference?.kind !== 'video') {
      return { url };
    }
    const video = await this.extractor.resolveVideo(reference.id);
    return { url: video.streamUrl, totalBytes: video.contentLength };
  }
}
