import { DarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { Theme } from './theme';

/** Adapts the design-system theme to React Navigation's theme contract. */
export function toNavigationTheme(theme: Theme): NavigationTheme {
  return {
    ...DarkTheme,
    dark: theme.isDark,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };
}
