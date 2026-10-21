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

function testAdapters(): PlatformAdapters {
  const storage = new InMemoryFileStorage();
  return {
    driver: new NodeSqliteDriver(),
    storage,
    picker: new FakeDocumentPicker(),
    network: new FakeNetworkMonitor(),
    downloader: new FakeFileDownloader(storage),
    engine: new FakePlaybackEngine(),
    youtube: new FakeYouTubeExtractor(),
    http: {
      getJson: async () => {
        throw new Error('offline in tests');
      },
      head: async () => ({ status: 200 }),
    },
    logger: silentLogger,
  };
}

async function renderApp() {
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <App adaptersFactory={testAdapters} />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('home-screen')).toBeOnTheScreen());
}

describe('App', () => {
  it('boots, shows onboarding on an empty library and navigates through tabs', async () => {
    await renderApp();
    expect(screen.getByText('Comece sua biblioteca')).toBeOnTheScreen();
    expect(screen.queryByTestId('mini-player')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Downloads' }));
    await waitFor(() => expect(screen.getByText('Nenhum download')).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole('tab', { name: 'Ajustes' }));
    await waitFor(() => expect(screen.getByText('Velocidade padrão')).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole('tab', { name: 'Coleções' }));
    await waitFor(() =>
      expect(screen.getByText('Organize seus áudios')).toBeOnTheScreen(),
    );
  });

  it('validates the form, creates a collection and deletes it keeping the library intact', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('tab', { name: 'Coleções' }));
    await fireEvent.press(await screen.findByTestId('create-collection'));

    await fireEvent.press(await screen.findByTestId('collection-form-submit'));
    expect(await screen.findByText('Informe um nome')).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByTestId('collection-form-name'),
      'Curso de Filosofia',
    );
    await fireEvent.press(screen.getByTestId('collection-form-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('collection-detail')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Coleção vazia')).toBeOnTheScreen();
    expect(screen.getByTestId('collection-stats')).toHaveTextContent(
      '0 áudios · 0 offline',
    );

    await fireEvent.press(screen.getByTestId('collection-more'));
    await fireEvent.press(await screen.findByTestId('menu-action-delete'));
    await fireEvent.press(await screen.findByTestId('confirm-delete-collection'));
    await waitFor(() =>
      expect(screen.getByText('Organize seus áudios')).toBeOnTheScreen(),
    );
  });

  it('shows a friendly error when an import source is unreachable', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('home-import'));
    await fireEvent.changeText(
      await screen.findByTestId('import-url-input'),
      'nao-e-um-link',
    );
    await fireEvent.press(screen.getByTestId('import-url-submit'));
    expect(
      await screen.findByText('Use um link completo começando com https://'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('import-example'));
    await fireEvent.press(screen.getByTestId('import-url-submit'));
    expect(await screen.findByTestId('error-state')).toBeOnTheScreen();
    expect(screen.queryByText(/offline in tests/)).toBeNull();
  });
});
