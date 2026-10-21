import React, { type PropsWithChildren } from 'react';
import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DependenciesProvider } from '@app/dependency-injection/DependenciesContext';
import { ThemeProvider } from '@design-system';
import { DownloadsScreen } from '@features/downloads/presentation';
import { usePlayAudio } from '@features/library/presentation/hooks/usePlayAudio';
import { useFeedbackStore } from '@shared/feedback/feedbackStore';
import { renderWithTheme, SAFE_AREA_METRICS } from '@test/support/renderWithProviders';
import { downloadAudio, importYouTubeVideos } from '@test/support/seed';
import { createTestApp, settle, type TestApp } from '@test/support/testContainer';

const Stack = createNativeStackNavigator();

jest.setTimeout(30000);

describe('Downloads tab: deleting a download', () => {
  let app: TestApp;
  let videos: string[];
  let playlistId: string;

  beforeEach(async () => {
    app = await createTestApp();
    videos = await importYouTubeVideos(app, ['video000001', 'video000002']);
    for (const audioId of videos) {
      await downloadAudio(app, audioId);
    }
    playlistId = (await app.container.playlists.create({ name: 'Favoritas' })).id;
    await app.container.playlists.addAudios(playlistId, videos);
  });

  afterEach(() => app.container.downloads.stop());

  const playlistIds = async () =>
    (await app.container.playlists.getDetail(playlistId)).items.map(
      item => item.audio.id,
    );

  async function openDeleteDialog() {
    await renderWithTheme(
      <DependenciesProvider container={app.container}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Downloads" component={DownloadsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </DependenciesProvider>,
    );
    const [deleteButton] = await screen.findAllByRole('button', {
      name: 'Excluir arquivo baixado',
    });
    await fireEvent.press(deleteButton!);
    expect(screen.getByText('Excluir download?')).toBeOnTheScreen();
  }

  it('offers removing the audio from the library, which also removes it from playlists', async () => {
    await openDeleteDialog();
    await fireEvent.press(screen.getByTestId('confirm-remove-from-library'));
    await settle();

    await waitFor(async () => expect(await playlistIds()).toHaveLength(1));
    expect(useFeedbackStore.getState().current?.message).toBe(
      'Áudio removido da biblioteca, das playlists e das coleções.',
    );
  });

  it('keeps the audio in the playlist when only the file is deleted', async () => {
    await openDeleteDialog();
    await fireEvent.press(screen.getByTestId('confirm-delete-download'));
    await settle();

    expect(await playlistIds()).toEqual(videos);
    const offline = await Promise.all(
      videos.map(async id => (await app.container.audios.getItem(id)).offline),
    );
    expect(offline.sort()).toEqual(['available', 'not-downloaded']);
  });
});

describe('usePlayAudio with YouTube audio', () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
    useFeedbackStore.setState({ current: null });
  });

  afterEach(() => app.container.downloads.stop());

  function renderPlayHook() {
    const wrapper = ({ children }: PropsWithChildren) => (
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <ThemeProvider>
          <DependenciesProvider container={app.container}>
            {children}
          </DependenciesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    return renderHook(() => usePlayAudio(), { wrapper });
  }

  it('starts the download instead of failing when the file is missing', async () => {
    const [audioId] = await importYouTubeVideos(app, ['video000001']);
    const { result } = await renderPlayHook();

    await result.current(await app.container.audios.getItem(audioId!));
    await settle();

    expect(app.downloader.started).toHaveLength(1);
    expect(app.container.player.getState().current).toBeUndefined();
    expect(useFeedbackStore.getState().current).toMatchObject({
      tone: 'info',
      message: expect.stringContaining('Baixando o áudio do YouTube'),
    });
  });

  it('plays the downloaded file', async () => {
    const [audioId] = await importYouTubeVideos(app, ['video000001']);
    await downloadAudio(app, audioId!);
    const { result } = await renderPlayHook();

    await result.current(await app.container.audios.getItem(audioId!));

    expect(app.container.player.getState().current).toMatchObject({
      audioId,
      isLocal: true,
    });
    expect(useFeedbackStore.getState().current).toBeNull();
  });

  it('explains that an old playlist link must be imported again', async () => {
    const [audioId] = await importYouTubeVideos(app, ['video000001']);
    const item = await app.container.audios.getItem(audioId!);
    const { result } = await renderPlayHook();

    await result.current({ ...item, audio: { ...item.audio, mediaUrl: undefined } });

    expect(app.downloader.started).toHaveLength(0);
    expect(useFeedbackStore.getState().current).toMatchObject({
      tone: 'error',
      message: expect.stringContaining('Importe a playlist de novo'),
    });
  });
});
