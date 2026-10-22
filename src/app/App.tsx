import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AppErrorState,
  AppLoadingIndicator,
  AppScreen,
  ThemeProvider,
  useTranslation,
} from '@design-system';
import { getUserMessage } from '@core/errors';
import { bootstrapApplication } from './bootstrap/bootstrap';
import type {
  AppContainer,
  PlatformAdapters,
} from './dependency-injection/createContainer';
import { RootNavigator } from './navigation/RootNavigator';
import { AppProviders } from './providers/AppProviders';

type BootState =
  | { kind: 'loading' }
  | { kind: 'ready'; container: AppContainer }
  | { kind: 'failed'; message: string };

function AppContent({ adaptersFactory }: { adaptersFactory?: () => PlatformAdapters }) {
  const { t } = useTranslation();
  const [state, setState] = useState<BootState>({ kind: 'loading' });

  const boot = useCallback(() => {
    setState({ kind: 'loading' });
    bootstrapApplication(adaptersFactory)
      .then(container => setState({ kind: 'ready', container }))
      .catch(error => {
        console.error('app.bootstrap_failed', error);
        setState({ kind: 'failed', message: getUserMessage(error) });
      });
  }, [adaptersFactory]);

  useEffect(boot, [boot]);

  return (
    <>
      {/* Edge-to-edge is enabled on Android: only the content style is configurable. */}
      <StatusBar barStyle="light-content" />
      {state.kind === 'ready' ? (
        <AppProviders container={state.container}>
          <RootNavigator />
        </AppProviders>
      ) : (
        <AppScreen>
          {state.kind === 'loading' ? (
            <AppLoadingIndicator fill label={t('app.preparing')} />
          ) : (
            <AppErrorState
              title={t('app.startFailed')}
              message={state.message}
              onRetry={boot}
            />
          )}
        </AppScreen>
      )}
    </>
  );
}

export default function App({
  adaptersFactory,
}: {
  adaptersFactory?: () => PlatformAdapters;
}) {
  return (
    <SafeAreaProvider>
      <ThemeProvider name="dark">
        <AppContent adaptersFactory={adaptersFactory} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
