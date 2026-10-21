module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Zod 4 ships `export * as ns from` syntax.
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ts', '.tsx', '.js', '.json'],
        alias: {
          '@app': './src/app',
          '@core': './src/core',
          '@design-system': './src/design-system',
          '@features': './src/features',
          '@infrastructure': './src/infrastructure',
          '@shared': './src/shared',
          '@test': './test',
        },
      },
    ],
  ],
};
