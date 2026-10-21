/** Semantic color palette. Components only consume semantic names. */
export interface ColorPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHighlight: string;

  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  onPrimary: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  divider: string;
  overlay: string;
  scrim: string;

  success: string;
  warning: string;
  error: string;
  errorMuted: string;

  skeleton: string;
  skeletonHighlight: string;
  transparent: string;
}

export const darkPalette: ColorPalette = {
  background: '#0B0D10',
  surface: '#15191E',
  surfaceElevated: '#1D232A',
  surfaceHighlight: '#272F38',

  primary: '#38BDF8',
  primaryPressed: '#0284C7',
  primaryMuted: 'rgba(56, 189, 248, 0.16)',
  onPrimary: '#04121C',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  border: '#29313B',
  divider: '#1F262E',
  overlay: 'rgba(11, 13, 16, 0.72)',
  scrim: 'rgba(0, 0, 0, 0.6)',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.16)',

  skeleton: '#1D232A',
  skeletonHighlight: '#272F38',
  transparent: 'transparent',
};

/**
 * Deterministic accent hues used to generate artwork placeholders so every
 * collection/audio without cover art still gets a distinctive tile.
 */
export const artworkHues = [
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#6366F1',
  '#EAB308',
  '#22C55E',
] as const;
