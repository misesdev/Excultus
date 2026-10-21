import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@design-system';

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

/** Renders design-system components with theme and safe-area context. */
export function renderWithTheme(element: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <ThemeProvider>{element}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

export { SAFE_AREA_METRICS };
