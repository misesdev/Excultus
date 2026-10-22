import {
  AppError,
  NetworkError,
  SourceUnavailableError,
  UnsupportedFormatError,
} from '@core/errors';
import { firstNonEmpty, parseHttpsUrl } from '@core/utils';
import NativeExcultusYouTube from '../../../../specs/NativeExcultusYouTube';
import type { YouTubeExtractor, YouTubePlaylist, YouTubeVideo } from './YouTubeExtractor';
import { t } from '@core/i18n';

function positiveMs(seconds: number): number | undefined {
  return seconds > 0 ? seconds * 1000 : undefined;
}

function httpsOrUndefined(url: string): string | undefined {
  return url && parseHttpsUrl(url) ? url : undefined;
}

/** Maps the documented native rejection codes to AppErrors. */
function toYouTubeError(error: unknown): AppError {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  switch (code) {
    case 'E_NETWORK':
      return new NetworkError(message, { cause: error });
    case 'E_UNAVAILABLE':
      return new SourceUnavailableError(message, {
        cause: error,
        userMessage: t('errors.youtube.videoUnavailable'),
      });
    case 'E_NO_AUDIO':
      return new UnsupportedFormatError(message, {
        cause: error,
        userMessage: t('errors.youtube.noAudio'),
      });
    default:
      return new SourceUnavailableError(message, {
        cause: error,
        userMessage: t('errors.youtube.extractionFailed'),
      });
  }
}

/** Adapter over the Kotlin TurboModule (NewPipeExtractor). */
export class NativeYouTubeExtractor implements YouTubeExtractor {
  async resolveVideo(videoId: string): Promise<YouTubeVideo> {
    try {
      const video = await NativeExcultusYouTube.resolveVideo(videoId);
      return {
        id: video.id,
        title: video.title,
        uploader: firstNonEmpty(video.uploader),
        durationMs: positiveMs(video.durationSeconds),
        thumbnailUrl: httpsOrUndefined(video.thumbnailUrl),
        streamUrl: video.streamUrl,
        mimeType: video.mimeType,
        contentLength: video.contentLength > 0 ? video.contentLength : undefined,
      };
    } catch (error) {
      throw toYouTubeError(error);
    }
  }

  async getPlaylist(playlistId: string, maxEntries: number): Promise<YouTubePlaylist> {
    try {
      const playlist = await NativeExcultusYouTube.getPlaylist(playlistId, maxEntries);
      return {
        id: playlist.id,
        title: playlist.title,
        uploader: firstNonEmpty(playlist.uploader),
        thumbnailUrl: httpsOrUndefined(playlist.thumbnailUrl),
        entries: playlist.entries
          .filter(entry => entry.id !== '')
          .map(entry => ({
            id: entry.id,
            title: entry.title,
            uploader: firstNonEmpty(entry.uploader),
            durationMs: positiveMs(entry.durationSeconds),
          })),
        truncated: playlist.truncated,
      };
    } catch (error) {
      throw toYouTubeError(error);
    }
  }
}
