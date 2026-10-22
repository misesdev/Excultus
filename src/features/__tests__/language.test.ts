/**
 * @jest-environment node
 */
import { getLocale, setLocale } from '@core/i18n';
import { DEFAULT_SETTINGS, normalizeSettings } from '@features/settings';
import { createTestApp } from '@test/support/testContainer';

/** No @types/node in this project: reach Node built-ins like NodeSqliteDriver does. */
function tempDbPath(): string {
  const { getBuiltinModule } = (
    globalThis as unknown as {
      process: { getBuiltinModule(id: string): unknown };
    }
  ).process;
  const fs = getBuiltinModule('fs') as { mkdtempSync(prefix: string): string };
  const os = getBuiltinModule('os') as { tmpdir(): string };
  return `${fs.mkdtempSync(`${os.tmpdir()}/excultus-i18n-`)}/app.db`;
}

describe('app language', () => {
  it.each([
    ['en_US', 'en'],
    ['pt_BR', 'pt'],
    ['pt-PT', 'pt'],
    ['de_DE', 'en'],
  ])('follows the device language %s by default', async (deviceLocale, locale) => {
    const app = await createTestApp({ deviceLocale });
    expect(app.container.settings.get().general.language).toBe('system');
    expect(getLocale()).toBe(locale);
    app.container.downloads.stop();
  });

  it('lets the saved preference override the device language and go back to it', async () => {
    const app = await createTestApp({ deviceLocale: 'pt-BR' });

    await app.container.settings.update({ general: { language: 'en' } });
    expect(getLocale()).toBe('en');

    await app.container.settings.update({ general: { language: 'system' } });
    expect(getLocale()).toBe('pt');
    app.container.downloads.stop();
  });

  it('keeps the preference across restarts', async () => {
    const dbPath = tempDbPath();
    const first = await createTestApp({ deviceLocale: 'pt-BR', dbPath });
    await first.container.settings.update({ general: { language: 'en' } });
    first.container.downloads.stop();
    setLocale('pt');

    const second = await createTestApp({ deviceLocale: 'pt-BR', dbPath });
    expect(second.container.settings.get().general.language).toBe('en');
    expect(getLocale()).toBe('en');
    second.container.downloads.stop();
  });

  it('ignores unknown persisted languages', () => {
    expect(normalizeSettings({ general: { language: 'klingon' } }).general).toEqual(
      DEFAULT_SETTINGS.general,
    );
  });
});
