import { DatabaseError } from '@core/errors';
import type { SqlRow, SqlValue } from './SqlDatabase';

/** Typed accessors that fail loudly on schema drift instead of leaking `unknown`. */
export function readString(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new DatabaseError(`Column ${column} is not a string`);
  }
  return value;
}

export function readOptionalString(row: SqlRow, column: string): string | undefined {
  const value = row[column];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readNumber(row: SqlRow, column: string): number {
  const value = row[column];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  throw new DatabaseError(`Column ${column} is not a number`);
}

export function readOptionalNumber(row: SqlRow, column: string): number | undefined {
  const value = row[column];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return undefined;
}

export function readBoolean(row: SqlRow, column: string): boolean {
  return readOptionalNumber(row, column) === 1;
}

/** Converts optional domain values into SQL parameters. */
export function toSql(value: string | number | boolean | undefined | null): SqlValue {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return value;
}

/** Builds "?, ?, ?" for IN clauses. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
