import type { LogContext, Logger } from '@core/application';
import { toAppError } from '@core/errors';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Structured logger writing single-line JSON records to the device log
 * (logcat). No data leaves the device; error causes are reduced to
 * code + message (stack traces stay in debug builds only).
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: Level = __DEV__ ? 'debug' : 'info') {}

  debug(event: string, context?: LogContext): void {
    this.write('debug', event, context);
  }

  info(event: string, context?: LogContext): void {
    this.write('info', event, context);
  }

  warn(event: string, context?: LogContext, error?: unknown): void {
    this.write('warn', event, context, error);
  }

  error(event: string, context?: LogContext, error?: unknown): void {
    this.write('error', event, context, error);
  }

  private write(
    level: Level,
    event: string,
    context?: LogContext,
    error?: unknown,
  ): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) {
      return;
    }
    const record: Record<string, unknown> = {
      level,
      event,
      at: new Date().toISOString(),
      ...context,
    };
    if (error !== undefined) {
      const appError = toAppError(error);
      record.errorCode = appError.code;
      record.errorMessage = appError.message;
      if (__DEV__ && error instanceof Error) {
        record.stack = error.stack;
      }
    }
    const line = JSON.stringify(record);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }
}
