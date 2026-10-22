import type { Logger } from '@core/application';
import { InvalidSourceUrlError, UnsupportedFormatError } from '@core/errors';
import { fileBaseName, fileExtension, parseHttpsUrl, pathSegments } from '@core/utils';
import {
  isSupportedExtension,
  mimeTypeForExtension,
  resolveAudioExtension,
} from '@features/audios';
import type {
  AudioSourceProvider,
  SourceAudioItem,
  SourceMetadata,
} from '@features/imports';
import type { HeadResult, HttpClient } from '../../http/HttpClient';
import { t } from '@core/i18n';

function lastSegment(url: string): string {
  const parsed = parseHttpsUrl(url);
  return parsed ? pathSegments(parsed.pathname).pop() ?? '' : '';
}

function stripFragment(url: string): string {
  return url.trim().split('#')[0] ?? url;
}

/** Any HTTPS link pointing straight to a supported audio file. */
export class DirectAudioProvider implements AudioSourceProvider {
  readonly id = 'direct';
  get label(): string {
    return t('imports.sources.directLink');
  }

  constructor(private readonly http: HttpClient, private readonly logger: Logger) {}

  canHandle(url: string): boolean {
    return (
      parseHttpsUrl(url) !== null && isSupportedExtension(fileExtension(lastSegment(url)))
    );
  }

  async getMetadata(url: string): Promise<SourceMetadata> {
    const clean = this.requireUrl(url);
    return {
      sourceType: 'direct',
      sourceId: clean,
      title: fileBaseName(lastSegment(clean)) || clean,
      originalUrl: clean,
    };
  }

  async getAudioItems(url: string): Promise<SourceAudioItem[]> {
    const clean = this.requireUrl(url);
    const head = await this.probe(clean);
    const name = lastSegment(clean);
    const extension = resolveAudioExtension({
      fileName: name,
      mimeType: head?.contentType,
    });
    if (!extension) {
      throw new UnsupportedFormatError(
        'The link does not point to a supported audio file',
        {
          details: { contentType: head?.contentType },
        },
      );
    }
    return [
      {
        sourceId: clean,
        title: fileBaseName(name).replace(/[_]+/g, ' ') || clean,
        sizeBytes: head?.contentLength,
        mimeType: mimeTypeForExtension(extension),
        fileExtension: extension,
        fileName: name,
        sourceUrl: clean,
        mediaUrl: clean,
        availability: 'available',
        acquisition: { kind: 'download', url: clean },
      },
    ];
  }

  private requireUrl(url: string): string {
    if (!this.canHandle(url)) {
      throw new InvalidSourceUrlError('Not a direct HTTPS audio link', {
        details: { url },
      });
    }
    return stripFragment(url);
  }

  /** HEAD is advisory: some servers reject it, in which case size stays unknown. */
  private async probe(url: string): Promise<HeadResult | undefined> {
    try {
      return await this.http.head(url);
    } catch (error) {
      this.logger.warn('direct.head_failed', {}, error);
      return undefined;
    }
  }
}
