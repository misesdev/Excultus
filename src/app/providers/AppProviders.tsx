import React, { useEffect, type PropsWithChildren } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { toNavigationTheme, useTheme } from '@design-system';
import { bindDownloadsStore } from '@features/downloads/presentation';
import { AudioActionsHost } from '@features/library/presentation';
import { bindPlayerStore } from '@features/player/presentation';
import { FeedbackHost } from '@shared/feedback/FeedbackHost';
import { DependenciesProvider } from '../dependency-injection/DependenciesContext';
import type { AppContainer } from '../dependency-injection/createContainer';

/** Mirrors service state (player, downloads) into presentation stores. */
function StoreBridges({ container }: { container: AppContainer }) {
  useEffect(() => bindPlayerStore(container.player), [container.player]);
  useEffect(() => bindDownloadsStore(container.downloads), [container.downloads]);
  return null;
}

export function AppProviders({
  container,
  children,
}: PropsWithChildren<{ container: AppContainer }>) {
  const theme = useTheme();
  return (
    <DependenciesProvider container={container}>
      <StoreBridges container={container} />
      <NavigationContainer theme={toNavigationTheme(theme)}>
        {children}
        <AudioActionsHost />
        <FeedbackHost />
      </NavigationContainer>
    </DependenciesProvider>
  );
}
