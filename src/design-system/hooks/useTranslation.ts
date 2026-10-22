import { useSyncExternalStore } from 'react';
import { getLocale, subscribeLocale, t, type Locale } from '@core/i18n';

/**
 * Re-renders the component when the app language changes. Use the returned
 * `t` (same as `@core/i18n`) for every user-facing string in presentation.
 */
export function useTranslation(): { t: typeof t; locale: Locale } {
  const locale = useSyncExternalStore(subscribeLocale, getLocale);
  return { t, locale };
}
