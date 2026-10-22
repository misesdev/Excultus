import {
  DEFAULT_LOCALE,
  formatDecimal,
  getLocale,
  resolveLocale,
  setLocale,
  subscribeLocale,
  t,
  type Messages,
} from '@core/i18n';
import { en } from '@core/i18n/locales/en';
import { pt } from '@core/i18n/locales/pt';
import { formatBytes, formatRelativeDate, formatShortDate } from '@core/utils';

afterEach(() => setLocale('pt'));

describe('resolveLocale', () => {
  it.each([
    ['pt-BR', 'pt'],
    ['pt_BR', 'pt'],
    ['pt_PT', 'pt'],
    ['PT', 'pt'],
    ['en_US', 'en'],
    ['en-GB', 'en'],
  ])('maps %s to %s', (tag, locale) => {
    expect(resolveLocale(tag)).toBe(locale);
  });

  it.each(['es-ES', 'fr_FR', 'ja', '', undefined, null])(
    'falls back to English for %p',
    tag => {
      expect(resolveLocale(tag)).toBe('en');
    },
  );

  it('uses English as the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('t', () => {
  it('translates in the current locale', () => {
    setLocale('en');
    expect(t('tabs.home')).toBe('Home');
    setLocale('pt');
    expect(t('tabs.home')).toBe('Início');
  });

  it('interpolates parameters', () => {
    setLocale('en');
    expect(t('audio.remaining', { duration: '5 min' })).toBe('5 min left');
    expect(t('library.noResultsFor', { query: 'kant', filter: 'favorites' })).toBe(
      'No results for "kant" in favorites.',
    );
  });

  it('picks singular or plural forms from count', () => {
    setLocale('en');
    expect(t('common.audioCount', { count: 1 })).toBe('1 track');
    expect(t('common.audioCount', { count: 0 })).toBe('0 tracks');
    expect(t('common.audioCount', { count: 12 })).toBe('12 tracks');
    setLocale('pt');
    expect(t('common.audioCount', { count: 1 })).toBe('1 áudio');
    expect(t('common.audioCount', { count: 3 })).toBe('3 áudios');
  });

  it('notifies subscribers only when the locale changes', () => {
    setLocale('pt');
    const listener = jest.fn();
    const unsubscribe = subscribeLocale(listener);
    setLocale('pt');
    setLocale('en');
    unsubscribe();
    setLocale('pt');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('en');
    expect(getLocale()).toBe('pt');
  });
});

describe('catalogs', () => {
  type Leaves = Array<[string, string]>;
  const leaves = (node: unknown, prefix = ''): Leaves =>
    Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value] as [string, string]]
        : leaves(value, `${prefix}${key}.`),
    );
  const placeholders = (text: string) => (text.match(/\{\{\w+\}\}/g) ?? []).sort();
  const enLeaves = new Map(leaves(en));
  const ptLeaves = new Map(leaves(pt satisfies Messages));

  it('have the same keys', () => {
    expect([...ptLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });

  it('have no empty messages', () => {
    for (const [key, text] of [...enLeaves, ...ptLeaves]) {
      expect({ key, empty: text.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it('use the same placeholders in every language', () => {
    for (const [key, text] of enLeaves) {
      expect({ key, placeholders: placeholders(ptLeaves.get(key) ?? '') }).toEqual({
        key,
        placeholders: placeholders(text),
      });
    }
  });
});

describe('locale-aware formatting', () => {
  const NOW = Date.parse('2026-10-21T12:00:00Z');

  it('formats numbers with the locale decimal separator', () => {
    setLocale('en');
    expect(formatDecimal(1.5)).toBe('1.5');
    expect(formatBytes(1536)).toBe('1.5 KB');
    setLocale('pt');
    expect(formatDecimal(1.5)).toBe('1,5');
    expect(formatBytes(1536)).toBe('1,5 KB');
  });

  it('formats relative and short dates in English', () => {
    setLocale('en');
    expect(formatRelativeDate(new Date(NOW - 30_000).toISOString(), NOW)).toBe(
      'just now',
    );
    expect(formatRelativeDate(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe(
      '5 min ago',
    );
    expect(formatRelativeDate(new Date(NOW - 26 * 3_600_000).toISOString(), NOW)).toBe(
      'yesterday',
    );
    expect(formatRelativeDate(new Date(NOW - 3 * 86_400_000).toISOString(), NOW)).toBe(
      '3 days ago',
    );
    const date = new Date(2026, 9, 5).getTime();
    expect(formatShortDate(date)).toBe('10/05/2026');
    setLocale('pt');
    expect(formatShortDate(date)).toBe('05/10/2026');
  });
});
