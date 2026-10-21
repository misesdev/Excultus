import { EventBus } from '@core/application';
import { getUserMessage, NetworkError, toAppError } from '@core/errors';
import {
  encodePath,
  fileBaseName,
  fileExtension,
  formatBytes,
  formatClock,
  formatHumanDuration,
  formatRelativeDate,
  moveItem,
  naturalCompare,
  parseHttpsUrl,
  parseUrl,
  stripHtml,
} from '@core/utils';

describe('url utils', () => {
  it('parses and validates URLs', () => {
    expect(parseUrl('https://Archive.org/details/X?a=1&b=two%20words#frag')).toEqual({
      href: 'https://Archive.org/details/X?a=1&b=two%20words#frag',
      protocol: 'https',
      host: 'archive.org',
      pathname: '/details/X',
      query: { a: '1', b: 'two words' },
    });
    expect(parseHttpsUrl('http://example.org')).toBeNull();
    // Security check: script URLs must never parse as navigable links.
    // eslint-disable-next-line no-script-url
    expect(parseUrl('javascript:alert(1)')).toBeNull();
    expect(parseUrl('not a url')).toBeNull();
  });

  it('handles file names with special characters', () => {
    expect(fileExtension('#PreCOF001.MP3')).toBe('mp3');
    expect(fileExtension('https://x.org/a/b.ogg?x=1#y')).toBe('ogg');
    expect(fileExtension('.hidden')).toBeUndefined();
    expect(fileBaseName('dir/Aula 1.mp3')).toBe('Aula 1');
    expect(encodePath('a b/#c.mp3')).toBe('a%20b/%23c.mp3');
  });
});

describe('formatting', () => {
  it('formats durations and sizes', () => {
    expect(formatClock(65000)).toBe('1:05');
    expect(formatClock(3725000)).toBe('1:02:05');
    expect(formatHumanDuration(7500000)).toBe('2 h 5 min');
    expect(formatHumanDuration(30000)).toBe('30 s');
    expect(formatBytes(43347153)).toBe('41,3 MB');
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats relative dates', () => {
    const now = Date.parse('2026-01-10T12:00:00.000Z');
    expect(formatRelativeDate('2026-01-10T11:59:30.000Z', now)).toBe('agora');
    expect(formatRelativeDate('2026-01-10T11:00:00.000Z', now)).toBe('há 1 h');
    expect(formatRelativeDate('2026-01-09T11:00:00.000Z', now)).toBe('ontem');
  });

  it('strips HTML and sorts naturally', () => {
    expect(stripHtml('A<div>B &amp; C</div><br/>D')).toBe('A\nB & C\nD');
    expect(['Aula 10', 'Aula 2', 'aula 1'].sort(naturalCompare)).toEqual([
      'aula 1',
      'Aula 2',
      'Aula 10',
    ]);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a'], 0, 5)).toEqual(['a']);
  });
});

describe('errors and events', () => {
  it('maps technical errors to friendly messages', () => {
    expect(getUserMessage(new NetworkError())).toMatch(/internet/);
    expect(toAppError(new Error('boom')).code).toBe('unknown');
    expect(getUserMessage('weird')).not.toContain('weird');
  });

  it('notifies each listener once per emit', () => {
    const bus = new EventBus();
    const listener = jest.fn();
    const unsubscribe = bus.subscribe(['library', 'collections'], listener);
    bus.emit('library', 'collections');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    bus.emit('library');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
