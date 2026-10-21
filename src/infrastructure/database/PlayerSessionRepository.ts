import type { Clock } from '@core/application';
import type {
  PlaybackQueue,
  PlayerSession,
  PlayerSessionStore,
  RepeatMode,
} from '@features/player';
import type { KeyValueRepository } from '@features/settings';

const SESSION_KEY = 'player.session';
const REPEAT_MODES: readonly RepeatMode[] = ['off', 'one', 'all'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => Number.isInteger(item));
}

/** Validates the stored session so a corrupted value can never crash startup. */
function parseSession(raw: unknown): PlayerSession | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const queue = value.queue as Record<string, unknown> | undefined;
  if (!queue || !isStringArray(queue.items) || !isNumberArray(queue.order)) {
    return null;
  }
  const items = queue.items;
  const order = queue.order;
  const position = typeof queue.position === 'number' ? queue.position : 0;
  const validOrder =
    order.length === items.length &&
    order.every(index => index >= 0 && index < items.length);
  if (!validOrder || position < 0 || position >= order.length) {
    return null;
  }
  const parsedQueue: PlaybackQueue = {
    items,
    order,
    position,
    shuffled: queue.shuffled === true,
  };
  return {
    queue: parsedQueue,
    repeatMode: REPEAT_MODES.includes(value.repeatMode as RepeatMode)
      ? (value.repeatMode as RepeatMode)
      : 'off',
    rate: typeof value.rate === 'number' && value.rate > 0 ? value.rate : 1,
    contextLabel: typeof value.contextLabel === 'string' ? value.contextLabel : undefined,
  };
}

export class PlayerSessionRepository implements PlayerSessionStore {
  constructor(
    private readonly keyValue: KeyValueRepository,
    private readonly clock: Clock,
  ) {}

  async load(): Promise<PlayerSession | null> {
    return parseSession(await this.keyValue.get(SESSION_KEY));
  }

  save(session: PlayerSession): Promise<void> {
    return this.keyValue.set(SESSION_KEY, session, this.clock.nowIso());
  }

  clear(): Promise<void> {
    return this.keyValue.delete(SESSION_KEY);
  }
}
