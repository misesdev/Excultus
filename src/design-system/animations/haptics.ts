import { trigger } from 'react-native-haptic-feedback';

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning';

const HAPTIC_TYPES = {
  selection: 'selection',
  light: 'impactLight',
  medium: 'impactMedium',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
} as const;

/** Respects the user's system haptic settings; never falls back to vibration. */
export function haptic(kind: HapticKind = 'light'): void {
  trigger(HAPTIC_TYPES[kind], {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: false,
  });
}
