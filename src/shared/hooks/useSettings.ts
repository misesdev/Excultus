import { useCallback, useSyncExternalStore } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import type { AppSettings } from '@features/settings';

/** Reactive view of the SettingsService (the service owns the state). */
export function useSettings(): AppSettings {
  const { settings } = useDependencies();
  const subscribe = useCallback(
    (onChange: () => void) => settings.subscribe(onChange),
    [settings],
  );
  return useSyncExternalStore(subscribe, () => settings.get());
}
