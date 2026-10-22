import type { Unsubscribe } from '../types';
import { en, type Messages, type PluralMessage } from './locales/en';
import { pt } from './locales/pt';

/**
 * Framework-agnostic translations. `t` reads the current locale at call
 * time, so every layer can use it; React components subscribe to locale
 * changes through `useTranslation` (shared/hooks) to re-render.
 */
export const SUPPORTED_LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Used when the device language is not supported. */
export const DEFAULT_LOCALE: Locale = 'en';

const CATALOGS: Record<Locale, Messages> = { en, pt };

type Leaf = string | PluralMessage;
type KeyPaths<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${KeyPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = KeyPaths<Messages>;
export type TranslationParams = Record<string, string | number>;

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

/** Maps a BCP 47 / Android tag ("pt-BR", "pt_PT", "en_US") to a supported locale. */
export function resolveLocale(tag: string | null | undefined): Locale {
  const language = tag?.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.find(locale => locale === language) ?? DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) {
    return;
  }
  current = locale;
  listeners.forEach(listener => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void): Unsubscribe {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function lookup(catalog: Messages, key: string): Leaf | undefined {
  let node: unknown = catalog;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

function isPlural(value: unknown): value is PluralMessage {
  return (
    typeof value === 'object' && value !== null && 'one' in value && 'other' in value
  );
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) {
    return text;
  }
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translates `key` in the current locale (falling back to English).
 * `{{name}}` placeholders are replaced from `params`; plural messages pick
 * `one` or `other` from `params.count`.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const message = lookup(CATALOGS[current], key) ?? lookup(CATALOGS.en, key) ?? key;
  const text =
    typeof message === 'string'
      ? message
      : params?.count === 1
      ? message.one
      : message.other;
  return interpolate(text, params);
}

/** Locale-aware decimal: "1.5" in English, "1,5" in Portuguese. */
export function formatDecimal(value: number, maxFractionDigits = 2): string {
  const fixed = Number(value.toFixed(maxFractionDigits)).toString();
  return current === 'pt' ? fixed.replace('.', ',') : fixed;
}
