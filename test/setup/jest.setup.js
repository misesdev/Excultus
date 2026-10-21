/* Global mocks for native modules that cannot run under Jest. */

jest.mock('react-native-haptic-feedback', () => ({ trigger: jest.fn() }));

jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => {
    throw new Error('op-sqlite is not available in Jest; use NodeSqliteDriver');
  },
}));

jest.mock('react-native-track-player', () => require('./mocks/trackPlayerMock'));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/data/app/files',
  CachesDirectoryPath: '/data/app/cache',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({
    isConnected: true,
    type: 'wifi',
    details: { isConnectionExpensive: false },
  })),
  addEventListener: jest.fn(() => () => undefined),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(async () => []),
  keepLocalCopy: jest.fn(async () => []),
  saveDocuments: jest.fn(async () => []),
  types: { audio: 'audio/*', images: 'image/*', json: 'application/json' },
  isErrorWithCode: () => false,
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
}));

jest.mock('../../specs/NativeExcultusDownloader', () => {
  const subscription = { remove: jest.fn() };
  return {
    __esModule: true,
    default: {
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      remuxFragmentedMp4: jest.fn(async () => false),
      onProgress: jest.fn(() => subscription),
      onCompleted: jest.fn(() => subscription),
      onFailed: jest.fn(() => subscription),
    },
  };
});

jest.mock('../../specs/NativeExcultusYouTube', () => ({
  __esModule: true,
  default: {
    resolveVideo: jest.fn(async () => {
      throw Object.assign(new Error('offline in tests'), { code: 'E_NETWORK' });
    }),
    getPlaylist: jest.fn(async () => {
      throw Object.assign(new Error('offline in tests'), { code: 'E_NETWORK' });
    }),
  },
}));
