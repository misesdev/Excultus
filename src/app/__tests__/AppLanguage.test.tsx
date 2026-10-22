/**
 * End-to-end language switch. Lives in its own file because the app container
 * is created once per JS runtime (bootstrapApplication).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from '@app/App';
import type { PlatformAdapters } from '@app/dependency-injection/createContainer';
import { FakePlaybackEngine } from '@test/support/FakePlaybackEngine';
import { NodeSqliteDriver } from '@test/support/NodeSqliteDriver';
import {
  FakeDocumentPicker,
  FakeFileDownloader,
  FakeNetworkMonitor,
  FakeYouTubeExtractor,
  InMemoryFileStorage,
  silentLogger,
} from '@test/support/fakes';
import { SAFE_AREA_METRICS } from '@test/support/renderWithProviders';

jest.setTimeout(30000);

function testAdapters(deviceLocale = 'pt-BR'): PlatformAdapters {
  const storage = new InMemoryFileStorage();
  return {
    driver: new NodeSqliteDriver(),
    storage,
    picker: new FakeDocumentPicker(),
    network: new FakeNetworkMonitor(),
    downloader: new FakeFileDownloader(storage),
    engine: new FakePlaybackEngine(),
    youtube: new FakeYouTubeExtractor(),
    deviceLocale: () => deviceLocale,
    http: {
      getJson: async () => {
        throw new Error('offline in tests');
      },
      head: async () => ({ status: 200 }),
    },
    logger: silentLogger,
  };
}

async function renderApp(deviceLocale?: string) {
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <App adaptersFactory={() => testAdapters(deviceLocale)} />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('home-screen')).toBeOnTheScreen());
}

describe('App language', () => {
  it('follows an English device and switches to Portuguese from Settings', async () => {
    await renderApp('en_US');
    expect(screen.getByText('Start your library')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Settings' }));
    await fireEvent.press(await screen.findByTestId('settings-language'));
    expect(screen.getAllByText('Automatic').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('option-pt'));

    await waitFor(() => expect(screen.getByText('Idioma do app')).toBeOnTheScreen());
    expect(screen.getByRole('tab', { name: 'Início' })).toBeOnTheScreen();
    expect(screen.getByText('Velocidade padrão')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Início' }));
    await waitFor(() =>
      expect(screen.getByText('Comece sua biblioteca')).toBeOnTheScreen(),
    );
  });
});
