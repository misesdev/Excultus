/* Minimal Track Player stand-in for component tests. */
const noop = jest.fn(async () => undefined);

module.exports = {
  __esModule: true,
  default: {
    setupPlayer: noop,
    updateOptions: noop,
    registerPlaybackService: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    load: noop,
    reset: noop,
    play: noop,
    pause: noop,
    stop: noop,
    seekTo: noop,
    setRate: noop,
    setRepeatMode: noop,
    getProgress: jest.fn(async () => ({ position: 0, duration: 0, buffered: 0 })),
  },
  Event: {},
  State: {},
  Capability: {},
  RepeatMode: { Off: 0, Track: 1, Queue: 2 },
  AppKilledPlaybackBehavior: {},
  AndroidAudioContentType: {},
};
