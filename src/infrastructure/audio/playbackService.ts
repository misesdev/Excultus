import TrackPlayer, { Event } from 'react-native-track-player';
import { remoteCommands } from './remoteCommands';

const SECONDS_TO_MS = 1000;

/**
 * Track Player playback service (registered in index.js). It runs in the
 * media service context, so it only forwards remote commands; all decisions
 * are taken by the PlayerController.
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () =>
    remoteCommands.emit({ type: 'play' }),
  );
  TrackPlayer.addEventListener(Event.RemotePause, () =>
    remoteCommands.emit({ type: 'pause' }),
  );
  TrackPlayer.addEventListener(Event.RemoteStop, () =>
    remoteCommands.emit({ type: 'stop' }),
  );
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    remoteCommands.emit({ type: 'next' }),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    remoteCommands.emit({ type: 'previous' }),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () =>
    remoteCommands.emit({ type: 'jump-forward' }),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () =>
    remoteCommands.emit({ type: 'jump-backward' }),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, event =>
    remoteCommands.emit({ type: 'seek', positionMs: event.position * SECONDS_TO_MS }),
  );
}
