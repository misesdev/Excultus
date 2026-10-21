/**
 * Typed error hierarchy shared by every layer.
 *
 * Errors carry a stable `code` (used to pick user-facing messages and for
 * structured logs) and an optional technical `cause`. The `message` is meant
 * for developers/logs only — never render it directly in the UI; use
 * `getUserMessage` instead.
 */
export type ErrorCode =
  | 'network'
  | 'invalid-source-url'
  | 'source-unavailable'
  | 'invalid-response'
  | 'unsupported-format'
  | 'insufficient-storage'
  | 'download-failed'
  | 'audio-playback'
  | 'database'
  | 'file-not-found'
  | 'permission-denied'
  | 'validation'
  | 'not-found'
  | 'cancelled'
  | 'unknown';

export class AppError extends Error {
  readonly code: ErrorCode;
  override readonly cause?: unknown;
  readonly details?: Readonly<Record<string, string | number | boolean | undefined>>;
  /** pt-BR text shown instead of the generic message for `code`. */
  readonly userMessage?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      cause?: unknown;
      details?: Record<string, string | number | boolean | undefined>;
      userMessage?: string;
    } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
    this.userMessage = options.userMessage;
  }
}

type ErrorOptions = ConstructorParameters<typeof AppError>[2];

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', options?: ErrorOptions) {
    super('network', message, options);
  }
}

export class InvalidSourceUrlError extends AppError {
  constructor(message = 'The URL is not a supported source', options?: ErrorOptions) {
    super('invalid-source-url', message, options);
  }
}

export class SourceUnavailableError extends AppError {
  constructor(message = 'The source is unavailable', options?: ErrorOptions) {
    super('source-unavailable', message, options);
  }
}

export class InvalidResponseError extends AppError {
  constructor(message = 'Unexpected response from source', options?: ErrorOptions) {
    super('invalid-response', message, options);
  }
}

export class UnsupportedFormatError extends AppError {
  constructor(message = 'Unsupported audio format', options?: ErrorOptions) {
    super('unsupported-format', message, options);
  }
}

export class InsufficientStorageError extends AppError {
  constructor(message = 'Not enough free storage', options?: ErrorOptions) {
    super('insufficient-storage', message, options);
  }
}

export class DownloadFailedError extends AppError {
  constructor(message = 'Download failed', options?: ErrorOptions) {
    super('download-failed', message, options);
  }
}

export class AudioPlaybackError extends AppError {
  constructor(message = 'Audio playback failed', options?: ErrorOptions) {
    super('audio-playback', message, options);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', options?: ErrorOptions) {
    super('database', message, options);
  }
}

export class FileNotFoundError extends AppError {
  constructor(message = 'File not found', options?: ErrorOptions) {
    super('file-not-found', message, options);
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'Permission denied', options?: ErrorOptions) {
    super('permission-denied', message, options);
  }
}

export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string, options?: ErrorOptions) {
    super('validation', message, options);
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('not-found', `${entity} not found`, { details: { entity, id } });
  }
}

export class CancelledError extends AppError {
  constructor(message = 'Operation cancelled', options?: ErrorOptions) {
    super('cancelled', message, options);
  }
}

/** Normalizes anything thrown into an AppError without losing the original cause. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new AppError('unknown', message, { cause: error });
}
