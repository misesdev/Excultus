import { ValidationError } from '@core/errors';
import { firstNonEmpty, normalizeWhitespace } from '@core/utils';

export const SOURCE_TYPES = ['archive', 'youtube', 'local', 'direct'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * Source-independent audio metadata. Storage state (downloads), playback
 * progress, favorites and collection membership are modelled separately and
 * never stored on this entity.
 */
export interface Audio {
  id: string;
  title: string;
  description?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  /** Local artwork file (absolute path) when available. */
  artworkPath?: string;
  sourceType: SourceType;
  /** Stable identifier inside the source (e.g. "COFemAudio/#PreCOF001.mp3"). */
  sourceId?: string;
  /** Human-facing page of the content at its origin. */
  sourceUrl?: string;
  /** Direct media URL usable for streaming or downloading, when the source allows it. */
  mediaUrl?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewAudioInput {
  title: string;
  description?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  artworkPath?: string;
  sourceType: SourceType;
  sourceId?: string;
  sourceUrl?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileSize?: number;
}

const MAX_TITLE_LENGTH = 300;

function positiveOrUndefined(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

export function createAudio(input: NewAudioInput, id: string, nowIso: string): Audio {
  const title = normalizeWhitespace(input.title).slice(0, MAX_TITLE_LENGTH);
  if (!title) {
    throw new ValidationError('Audio title is required', 'title');
  }
  if (!SOURCE_TYPES.includes(input.sourceType)) {
    throw new ValidationError(`Unknown source type "${input.sourceType}"`, 'sourceType');
  }
  return {
    id,
    title,
    description: firstNonEmpty(input.description),
    artist: firstNonEmpty(input.artist),
    album: firstNonEmpty(input.album),
    durationMs: positiveOrUndefined(input.durationMs),
    artworkPath: input.artworkPath,
    sourceType: input.sourceType,
    sourceId: firstNonEmpty(input.sourceId),
    sourceUrl: firstNonEmpty(input.sourceUrl),
    mediaUrl: firstNonEmpty(input.mediaUrl),
    mimeType: firstNonEmpty(input.mimeType),
    fileSize: positiveOrUndefined(input.fileSize),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Re-importing an existing audio refreshes source metadata but never discards
 * information the library already has (e.g. a duration learned during playback).
 */
export function mergeAudioMetadata(
  existing: Audio,
  incoming: NewAudioInput,
  nowIso: string,
): Audio {
  return {
    ...existing,
    title: firstNonEmpty(incoming.title, existing.title) ?? existing.title,
    description: firstNonEmpty(incoming.description, existing.description),
    artist: firstNonEmpty(incoming.artist, existing.artist),
    album: firstNonEmpty(incoming.album, existing.album),
    durationMs: positiveOrUndefined(incoming.durationMs) ?? existing.durationMs,
    artworkPath: existing.artworkPath ?? incoming.artworkPath,
    sourceUrl: firstNonEmpty(incoming.sourceUrl, existing.sourceUrl),
    mediaUrl: firstNonEmpty(incoming.mediaUrl, existing.mediaUrl),
    mimeType: firstNonEmpty(incoming.mimeType, existing.mimeType),
    fileSize: positiveOrUndefined(incoming.fileSize) ?? existing.fileSize,
    updatedAt: nowIso,
  };
}

/** Streaming/downloading is only possible when the source exposes a media URL. */
export function isRemotelyPlayable(audio: Audio): boolean {
  return audio.sourceType !== 'youtube' && audio.mediaUrl !== undefined;
}
