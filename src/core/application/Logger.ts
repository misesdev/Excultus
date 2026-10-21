export type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * Structured logger port. Events are short machine-friendly names
 * (e.g. "download.failed"); context carries diagnostic fields.
 * Never log personal data or file contents.
 */
export interface Logger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext, error?: unknown): void;
  error(event: string, context?: LogContext, error?: unknown): void;
}
