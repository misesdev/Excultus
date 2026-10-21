import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { AppContainer } from './createContainer';

const DependenciesContext = createContext<AppContainer | null>(null);

export function DependenciesProvider({
  container,
  children,
}: PropsWithChildren<{ container: AppContainer }>) {
  return (
    <DependenciesContext.Provider value={container}>
      {children}
    </DependenciesContext.Provider>
  );
}

/** Access to use cases/services from presentation code (never to infrastructure). */
export function useDependencies(): AppContainer {
  const container = useContext(DependenciesContext);
  if (!container) {
    throw new Error('useDependencies must be used inside DependenciesProvider');
  }
  return container;
}
