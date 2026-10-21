import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { themes, type Theme, type ThemeName } from './theme';

const ThemeContext = createContext<Theme>(themes.dark);

export function ThemeProvider({
  name = 'dark',
  children,
}: PropsWithChildren<{ name?: ThemeName }>) {
  return <ThemeContext.Provider value={themes[name]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

type StyleMap = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Creates a themed style hook. Styles are computed once per theme and
 * memoized, so components never hardcode colors or sizes.
 *
 * const useStyles = makeStyles(theme => ({ root: { padding: theme.spacing.lg } }));
 */
export function makeStyles<T extends StyleMap>(factory: (theme: Theme) => T & StyleMap) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      const cached = cache.get(theme);
      if (cached) {
        return cached;
      }
      const styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
      return styles;
    }, [theme]);
  };
}
