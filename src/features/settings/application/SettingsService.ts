import type { Clock, EventBus } from '@core/application';
import type { Unsubscribe } from '@core/types';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type AppSettings,
  type SettingsPatch,
} from '../domain/entities/AppSettings';
import type { KeyValueRepository } from '../domain/repositories/SettingsRepository';

const SETTINGS_KEY = 'app.settings';

/**
 * Owns the in-memory copy of settings (loaded once at bootstrap) so other
 * services can read them synchronously, and persists every change.
 */
export class SettingsService {
  private current: AppSettings = DEFAULT_SETTINGS;
  private readonly listeners = new Set<(settings: AppSettings) => void>();

  constructor(
    private readonly repository: KeyValueRepository,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {}

  async load(): Promise<AppSettings> {
    this.current = normalizeSettings(await this.repository.get(SETTINGS_KEY));
    this.notify();
    return this.current;
  }

  get(): AppSettings {
    return this.current;
  }

  async update(patch: SettingsPatch): Promise<AppSettings> {
    const next = applySettingsPatch(this.current, patch);
    await this.repository.set(SETTINGS_KEY, next, this.clock.nowIso());
    this.current = next;
    this.notify();
    this.events.emit('settings');
    return next;
  }

  subscribe(listener: (settings: AppSettings) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.current));
  }
}
