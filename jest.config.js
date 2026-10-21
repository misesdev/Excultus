module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/test/setup/jest.setup.js'],
  moduleNameMapper: {
    // Fonts are native assets; tests only need a module id.
    '\\.(ttf|otf)$': '<rootDir>/test/setup/mocks/fileMock.js',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@design-system$': '<rootDir>/src/design-system',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-navigation|@op-engineering|@dr.pogodin|@react-native-documents|react-native-.*)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts'],
};
