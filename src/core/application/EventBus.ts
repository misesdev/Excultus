import type { Unsubscribe } from '../types/Unsubscribe';

/**
 * Coarse-grained change notifications emitted by use cases after successful
 * mutations. Presentation queries subscribe to the topics they depend on
 * and refetch, so SQLite stays the single source of truth.
 */
export type DataTopic =
  | 'library'
  | 'collections'
  | 'downloads'
  | 'playlists'
  | 'bookmarks'
  | 'history'
  | 'settings';

export class EventBus {
  private readonly listeners = new Map<DataTopic, Set<() => void>>();

  emit(...topics: DataTopic[]): void {
    const unique = new Set(topics);
    const called = new Set<() => void>();
    for (const topic of unique) {
      this.listeners.get(topic)?.forEach(listener => {
        if (!called.has(listener)) {
          called.add(listener);
          listener();
        }
      });
    }
  }

  subscribe(topics: readonly DataTopic[], listener: () => void): Unsubscribe {
    for (const topic of topics) {
      let set = this.listeners.get(topic);
      if (!set) {
        set = new Set();
        this.listeners.set(topic, set);
      }
      set.add(listener);
    }
    return () => {
      for (const topic of topics) {
        this.listeners.get(topic)?.delete(listener);
      }
    };
  }
}
