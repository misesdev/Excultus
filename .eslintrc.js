const frameworkImports = [
  'react',
  'react-native',
  'react-native-*',
  '@react-native*',
  '@react-navigation/*',
  '@op-engineering/*',
  '@dr.pogodin/*',
  'zustand',
  'zustand/*',
];

module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['android/', 'ios/', 'coverage/', 'node_modules/', '!.*.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': true, 'ts-nocheck': true },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@features/*/*', '!@features/*/presentation'],
            message:
              'Import features only through their public API ("@features/x" or "@features/x/presentation").',
          },
          {
            group: ['@design-system/*'],
            message: 'Import the design system only through "@design-system".',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Domain and application layers must stay framework-agnostic.
      files: ['src/**/domain/**/*.ts', 'src/**/application/**/*.ts', 'src/core/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: frameworkImports,
                message: 'Domain/application code must not depend on frameworks.',
              },
              {
                group: [
                  '@infrastructure/*',
                  '@app/*',
                  '@design-system',
                  '@features/*/presentation',
                  '**/presentation/**',
                ],
                message: 'Inner layers must not depend on outer layers.',
              },
              {
                group: ['@features/*/*', '!@features/*/presentation'],
                message: 'Use the feature public API.',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'test/**',
        'jest.setup.js',
      ],
      env: { jest: true },
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
};
