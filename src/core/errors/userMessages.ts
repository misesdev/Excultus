import { t, type TranslationKey } from '../i18n';
import { toAppError, type ErrorCode } from './AppError';

/**
 * Maps technical errors to friendly, actionable messages in the current
 * locale. Stack traces and raw messages never reach the UI.
 */
const MESSAGE_KEYS: Record<ErrorCode, TranslationKey> = {
  network: 'errors.network',
  'invalid-source-url': 'errors.invalidSourceUrl',
  'source-unavailable': 'errors.sourceUnavailable',
  'invalid-response': 'errors.invalidResponse',
  'unsupported-format': 'errors.unsupportedFormat',
  'insufficient-storage': 'errors.insufficientStorage',
  'download-failed': 'errors.downloadFailed',
  'audio-playback': 'errors.audioPlayback',
  database: 'errors.database',
  'file-not-found': 'errors.fileNotFound',
  'permission-denied': 'errors.permissionDenied',
  validation: 'errors.validation',
  'not-found': 'errors.notFound',
  cancelled: 'errors.cancelled',
  unknown: 'errors.unknown',
};

export function getUserMessage(error: unknown): string {
  const appError = toAppError(error);
  return appError.userMessage ?? t(MESSAGE_KEYS[appError.code]);
}

export function getUserMessageForCode(code: ErrorCode): string {
  return t(MESSAGE_KEYS[code]);
}
