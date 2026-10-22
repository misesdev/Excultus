import { I18nManager } from 'react-native';

/**
 * Language tag of the device ("pt_BR" on Android), read once at startup.
 * Falls back to the JS engine's Intl locale; undefined when neither exists.
 */
export function getDeviceLocale(): string | undefined {
  const { localeIdentifier } = I18nManager.getConstants();
  if (localeIdentifier) {
    return localeIdentifier;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}
