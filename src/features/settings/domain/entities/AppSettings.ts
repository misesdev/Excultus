export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export const SKIP_INTERVALS_SEC = [10, 15, 30] as const;
export const COMPLETION_THRESHOLDS = [0.9, 0.95, 0.98, 1] as const;
export const MAX_CONCURRENT_DOWNLOADS_OPTIONS = [1, 2, 3, 4, 5] as const;
export const AUTO_RETRY_OPTIONS = [0, 1, 3, 5] as const;
/** `system` follows the device language (English when it isn't supported). */
export const LANGUAGE_OPTIONS = ['system', 'en', 'pt'] as const;

export type LanguagePreference = (typeof LANGUAGE_OPTIONS)[number];

export type SkipIntervalSec = (typeof SKIP_INTERVALS_SEC)[number];

export interface PlaybackSettings {
  defaultSpeed: number;
  skipForwardSec: SkipIntervalSec;
  skipBackwardSec: SkipIntervalSec;
  autoPlayNext: boolean;
  /** Fraction of the duration after which an audio counts as completed. */
  completionThreshold: number;
  /** Resume from the saved position when an audio is played again. */
  autoResume: boolean;
}

export interface DownloadSettings {
  maxConcurrent: number;
  wifiOnly: boolean;
  autoRetryAttempts: number;
}

export interface AppearanceSettings {
  theme: 'dark';
}

export interface GeneralSettings {
  language: LanguagePreference;
}

export interface AppSettings {
  playback: PlaybackSettings;
  downloads: DownloadSettings;
  appearance: AppearanceSettings;
  general: GeneralSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  playback: {
    defaultSpeed: 1,
    skipForwardSec: 30,
    skipBackwardSec: 15,
    autoPlayNext: true,
    completionThreshold: 0.95,
    autoResume: true,
  },
  downloads: { maxConcurrent: 2, wifiOnly: false, autoRetryAttempts: 3 },
  appearance: { theme: 'dark' },
  general: { language: 'system' },
};

export type SettingsPatch = {
  [K in keyof AppSettings]?: Partial<AppSettings[K]>;
};

function pick<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Coerces unknown/partial persisted data into valid settings. Unknown or
 * out-of-range values fall back to defaults, so a corrupted or outdated
 * settings row can never break the app.
 */
export function normalizeSettings(raw: unknown): AppSettings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<
    string,
    Record<string, unknown> | undefined
  >;
  const playback = source.playback ?? {};
  const downloads = source.downloads ?? {};
  const general = source.general ?? {};
  const defaults = DEFAULT_SETTINGS;

  return {
    playback: {
      defaultSpeed: pick(
        PLAYBACK_SPEEDS,
        playback.defaultSpeed,
        defaults.playback.defaultSpeed,
      ),
      skipForwardSec: pick(
        SKIP_INTERVALS_SEC,
        playback.skipForwardSec,
        defaults.playback.skipForwardSec,
      ),
      skipBackwardSec: pick(
        SKIP_INTERVALS_SEC,
        playback.skipBackwardSec,
        defaults.playback.skipBackwardSec,
      ),
      autoPlayNext: bool(playback.autoPlayNext, defaults.playback.autoPlayNext),
      completionThreshold: pick(
        COMPLETION_THRESHOLDS,
        playback.completionThreshold,
        defaults.playback.completionThreshold,
      ),
      autoResume: bool(playback.autoResume, defaults.playback.autoResume),
    },
    downloads: {
      maxConcurrent: pick(
        MAX_CONCURRENT_DOWNLOADS_OPTIONS,
        downloads.maxConcurrent,
        defaults.downloads.maxConcurrent,
      ),
      wifiOnly: bool(downloads.wifiOnly, defaults.downloads.wifiOnly),
      autoRetryAttempts: pick(
        AUTO_RETRY_OPTIONS,
        downloads.autoRetryAttempts,
        defaults.downloads.autoRetryAttempts,
      ),
    },
    appearance: { theme: 'dark' },
    general: {
      language: pick(LANGUAGE_OPTIONS, general.language, defaults.general.language),
    },
  };
}

export function applySettingsPatch(
  current: AppSettings,
  patch: SettingsPatch,
): AppSettings {
  return normalizeSettings({
    playback: { ...current.playback, ...patch.playback },
    downloads: { ...current.downloads, ...patch.downloads },
    appearance: { ...current.appearance, ...patch.appearance },
    general: { ...current.general, ...patch.general },
  });
}
