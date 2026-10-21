import {
  componentSizes,
  darkPalette,
  durations,
  easings,
  elevation,
  iconSizes,
  opacity,
  radius,
  shadows,
  spacing,
  typography,
  type ColorPalette,
} from '../tokens';

export type ThemeName = 'dark';

export interface Theme {
  name: ThemeName;
  isDark: boolean;
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  opacity: typeof opacity;
  iconSizes: typeof iconSizes;
  sizes: typeof componentSizes;
  shadows: typeof shadows;
  elevation: typeof elevation;
  durations: typeof durations;
  easings: typeof easings;
}

function buildTheme(name: ThemeName, colors: ColorPalette, isDark: boolean): Theme {
  return {
    name,
    isDark,
    colors,
    typography,
    spacing,
    radius,
    opacity,
    iconSizes,
    sizes: componentSizes,
    shadows,
    elevation,
    durations,
    easings,
  };
}

/**
 * Registry of available themes. Adding a light theme only requires a new
 * palette and an entry here; components read everything from `Theme`.
 */
export const themes: Record<ThemeName, Theme> = {
  dark: buildTheme('dark', darkPalette, true),
};
