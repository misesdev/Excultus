import { fileExtension } from '@core/utils';

/**
 * Audio formats the app accepts. Both extension and MIME type are validated
 * so that files are never trusted by name alone.
 */
const FORMATS = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  m4b: ['audio/mp4', 'audio/x-m4b'],
  aac: ['audio/aac', 'audio/x-aac', 'audio/aacp'],
  ogg: ['audio/ogg', 'application/ogg'],
  oga: ['audio/ogg'],
  opus: ['audio/opus', 'audio/ogg'],
  flac: ['audio/flac', 'audio/x-flac'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
} as const;

export type AudioExtension = keyof typeof FORMATS;

export const SUPPORTED_AUDIO_EXTENSIONS = Object.keys(FORMATS) as AudioExtension[];

export function isSupportedExtension(
  extension: string | undefined,
): extension is AudioExtension {
  return extension !== undefined && extension in FORMATS;
}

export function mimeTypeForExtension(extension: AudioExtension): string {
  return FORMATS[extension][0];
}

function normalizeMime(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function extensionForMimeType(
  mimeType: string | undefined,
): AudioExtension | undefined {
  if (!mimeType) {
    return undefined;
  }
  const normalized = normalizeMime(mimeType);
  return SUPPORTED_AUDIO_EXTENSIONS.find(extension =>
    (FORMATS[extension] as readonly string[]).includes(normalized),
  );
}

/**
 * Resolves a safe extension for a file, or undefined when the file is not a
 * supported audio. When both are known, the MIME type must be compatible
 * with the extension; generic types (octet-stream) defer to the extension.
 */
export function resolveAudioExtension(params: {
  fileName?: string;
  mimeType?: string;
}): AudioExtension | undefined {
  const byName = fileExtension(params.fileName ?? '');
  const mime = params.mimeType ? normalizeMime(params.mimeType) : undefined;
  const genericMime =
    !mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream';

  if (isSupportedExtension(byName)) {
    if (genericMime || (FORMATS[byName] as readonly string[]).includes(mime)) {
      return byName;
    }
    // MIME says audio but a different container: trust the MIME type.
    return extensionForMimeType(mime);
  }
  return genericMime ? undefined : extensionForMimeType(mime);
}
