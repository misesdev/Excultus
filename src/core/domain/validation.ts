import { ValidationError } from '../errors';
import { normalizeWhitespace } from '../utils/text';

/** Validates a required, single-line name. */
export function requireName(value: string, field: string, maxLength: number): string {
  const name = normalizeWhitespace(value);
  if (!name) {
    throw new ValidationError(`${field} is required`, field);
  }
  if (name.length > maxLength) {
    throw new ValidationError(`${field} is too long`, field);
  }
  return name;
}

/** Validates optional multi-line text, returning undefined when blank. */
export function optionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }
  if (text.length > maxLength) {
    throw new ValidationError(`${field} is too long`, field);
  }
  return text;
}
