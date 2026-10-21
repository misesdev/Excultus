import type { Unsubscribe } from '@core/types';
import type { RemoteCommand } from '@features/player';

type Listener = (command: RemoteCommand) => void;

/**
 * Bridges remote media commands (notification, lock screen, headset) from
 * the Track Player playback service to the engine adapter. Commands that
 * arrive before the engine subscribes are dropped intentionally: without a
 * loaded session there is nothing to control.
 */
class RemoteCommandBus {
  private readonly listeners = new Set<Listener>();

  emit(command: RemoteCommand): void {
    this.listeners.forEach(listener => listener(command));
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const remoteCommands = new RemoteCommandBus();
