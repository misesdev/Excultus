import { InvalidSourceUrlError, SourceUnavailableError } from '@core/errors';
import {
  encodePath,
  fileBaseName,
  fileExtension,
  firstNonEmpty,
  naturalCompare,
  parseHttpsUrl,
  pathSegments,
  stripHtml,
} from '@core/utils';
import {
  isSupportedExtension,
  mimeTypeForExtension,
  type AudioExtension,
} from '@features/audios';
import type {
  AudioSourceProvider,
  SourceAudioItem,
  SourceMetadata,
} from '@features/imports';
import type { HttpClient } from '../../http/HttpClient';
import {
  archiveMetadataResponseSchema,
  type ArchiveFile,
  type ArchiveMetadataResponse,
} from './archiveSchema';

const ARCHIVE_HOSTS = ['archive.org', 'www.archive.org'];
const ITEM_ROUTES = ['details', 'download', 'metadata', 'embed'];
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BASE_URL = 'https://archive.org';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MS_PER_SECOND = 1000;

/** Lower is better: compact, widely supported formats first. */
const FORMAT_PREFERENCE: Record<AudioExtension, number> = {
  mp3: 0,
  m4a: 1,
  m4b: 1,
  aac: 2,
  opus: 3,
  ogg: 3,
  oga: 3,
  flac: 4,
  wav: 5,
};

/** Formats Archive.org lists that are never audio, even with odd extensions. */
const NON_AUDIO_FORMATS =
  /spectrogram|png|jpeg|metadata|torrent|thumbnail|item tile|text|pdf|zip/i;

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return firstNonEmpty(value);
  }
  if (Array.isArray(value)) {
    return firstNonEmpty(value.filter(item => typeof item === 'string').join(', '));
  }
  return undefined;
}

/** "4104.91", "02:03", "1:02:03" -> milliseconds; zero/invalid -> undefined. */
export function parseArchiveLength(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = String(value).trim();
  let seconds: number;
  if (raw.includes(':')) {
    seconds = raw.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  } else {
    seconds = Number(raw);
  }
  return Number.isFinite(seconds) && seconds > 0
    ? Math.round(seconds * MS_PER_SECOND)
    : undefined;
}

function parseTrack(value: string | number | undefined): number | undefined {
  const parsed = Number.parseInt(String(value ?? '').split('/')[0] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseSize(value: string | number | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isPrivate(file: ArchiveFile): boolean {
  return file.private === true || file.private === 'true';
}

function audioExtensionOf(file: ArchiveFile): AudioExtension | undefined {
  if (file.format && NON_AUDIO_FORMATS.test(file.format)) {
    return undefined;
  }
  const extension = fileExtension(file.name);
  return isSupportedExtension(extension) ? extension : undefined;
}

function prettifyFileTitle(name: string): string {
  return fileBaseName(name).replace(/[_]+/g, ' ').trim() || name;
}

export function extractArchiveIdentifier(url: string): string | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed || !ARCHIVE_HOSTS.includes(parsed.host)) {
    return null;
  }
  const [route, identifier] = pathSegments(parsed.pathname);
  if (
    !route ||
    !ITEM_ROUTES.includes(route) ||
    !identifier ||
    !IDENTIFIER_PATTERN.test(identifier)
  ) {
    return null;
  }
  return identifier;
}

/**
 * Internet Archive provider (https://archive.org/metadata/{identifier}).
 *
 * Items usually expose the same recording in several files (an original
 * plus derivatives such as VBR MP3/Ogg). Files are grouped by their original
 * and the best playable format is chosen, so each recording appears once
 * with a stable source id (identifier + original file name).
 */
export class ArchiveOrgProvider implements AudioSourceProvider {
  readonly id = 'archive';
  readonly label = 'Internet Archive';
  private readonly cache = new Map<
    string,
    { at: number; response: Promise<ArchiveMetadataResponse> }
  >();

  constructor(
    private readonly http: HttpClient,
    private readonly now: () => number = Date.now,
  ) {}

  canHandle(url: string): boolean {
    return extractArchiveIdentifier(url) !== null;
  }

  async getMetadata(url: string): Promise<SourceMetadata> {
    const identifier = this.requireIdentifier(url);
    const response = await this.fetchItem(identifier);
    const metadata = response.metadata ?? {};
    const license = asText(metadata.licenseurl) ?? asText(metadata.rights);
    const description = asText(metadata.description);
    return {
      sourceType: 'archive',
      sourceId: identifier,
      title: asText(metadata.title) ?? identifier,
      description: description ? stripHtml(description) : undefined,
      creator: asText(metadata.creator),
      artworkUrl: `${BASE_URL}/services/img/${encodeURIComponent(identifier)}`,
      originalUrl: `${BASE_URL}/details/${encodeURIComponent(identifier)}`,
      license,
      extra: Object.fromEntries(
        ['mediatype', 'language', 'subject', 'publicdate', 'date']
          .map(key => [key, asText(metadata[key])] as const)
          .filter((entry): entry is readonly [string, string] => entry[1] !== undefined),
      ),
    };
  }

  async getAudioItems(url: string): Promise<SourceAudioItem[]> {
    const identifier = this.requireIdentifier(url);
    const response = await this.fetchItem(identifier);
    const metadata = response.metadata ?? {};
    const restrictedItem = asText(metadata['access-restricted-item']) === 'true';
    const itemCreator = asText(metadata.creator);
    const itemTitle = asText(metadata.title) ?? identifier;

    const groups = new Map<string, ArchiveFile[]>();
    for (const file of response.files ?? []) {
      const key =
        file.source === 'derivative' && file.original ? file.original : file.name;
      groups.set(key, [...(groups.get(key) ?? []), file]);
    }

    const items: SourceAudioItem[] = [];
    for (const [originalName, files] of groups) {
      const candidates = files
        .map(file => ({ file, extension: audioExtensionOf(file) }))
        .filter(
          (candidate): candidate is { file: ArchiveFile; extension: AudioExtension } =>
            !!candidate.extension,
        )
        .sort((a, b) => {
          const privacy = Number(isPrivate(a.file)) - Number(isPrivate(b.file));
          return privacy !== 0
            ? privacy
            : FORMAT_PREFERENCE[a.extension] - FORMAT_PREFERENCE[b.extension];
        });
      const best = candidates[0];
      if (!best) {
        continue; // Not an audio recording (images, metadata, torrents...).
      }
      const original = files.find(file => file.name === originalName);
      const restricted = restrictedItem || isPrivate(best.file);
      const durationMs =
        Math.max(0, ...files.map(file => parseArchiveLength(file.length) ?? 0)) ||
        undefined;
      const mediaUrl = `${BASE_URL}/download/${encodeURIComponent(
        identifier,
      )}/${encodePath(best.file.name)}`;

      items.push({
        sourceId: `${identifier}/${originalName}`,
        title:
          firstNonEmpty(
            original?.title,
            best.file.title,
            ...files.map(file => file.title),
          ) ?? prettifyFileTitle(originalName),
        artist: firstNonEmpty(
          original?.creator,
          original?.artist,
          best.file.creator,
          itemCreator,
        ),
        album: firstNonEmpty(original?.album, best.file.album, itemTitle),
        durationMs,
        sizeBytes: parseSize(best.file.size),
        mimeType: mimeTypeForExtension(best.extension),
        fileExtension: best.extension,
        trackNumber: parseTrack(original?.track ?? best.file.track),
        fileName: best.file.name,
        sourceUrl: `${BASE_URL}/details/${encodeURIComponent(identifier)}`,
        mediaUrl: restricted ? undefined : mediaUrl,
        availability: restricted ? 'restricted' : 'available',
        acquisition: restricted
          ? { kind: 'link-only' }
          : { kind: 'download', url: mediaUrl, expectedMd5: best.file.md5 },
      });
    }

    return items.sort((a, b) => {
      if (
        a.trackNumber !== undefined &&
        b.trackNumber !== undefined &&
        a.trackNumber !== b.trackNumber
      ) {
        return a.trackNumber - b.trackNumber;
      }
      return naturalCompare(a.fileName ?? a.title, b.fileName ?? b.title);
    });
  }

  private requireIdentifier(url: string): string {
    const identifier = extractArchiveIdentifier(url);
    if (!identifier) {
      throw new InvalidSourceUrlError('Not an Internet Archive item URL', {
        details: { url },
      });
    }
    return identifier;
  }

  /** Metadata and file listing share one request (cached briefly). */
  private fetchItem(identifier: string): Promise<ArchiveMetadataResponse> {
    const cached = this.cache.get(identifier);
    if (cached && this.now() - cached.at < CACHE_TTL_MS) {
      return cached.response;
    }
    const response = this.http
      .getJson(
        `${BASE_URL}/metadata/${encodeURIComponent(identifier)}`,
        archiveMetadataResponseSchema,
      )
      .then(body => {
        if (!body.metadata || body.is_dark === true) {
          throw new SourceUnavailableError(
            'Archive item does not exist or is not public',
            {
              details: { identifier },
            },
          );
        }
        return body;
      });
    response.catch(() => this.cache.delete(identifier));
    this.cache.set(identifier, { at: this.now(), response });
    return response;
  }
}
