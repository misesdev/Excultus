export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const opacity = {
  disabled: 0.4,
  pressed: 0.72,
  muted: 0.6,
  overlay: 0.72,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
  xxl: 56,
  hero: 72,
} as const;

export type IconSize = keyof typeof iconSizes;

export const componentSizes = {
  /** Minimum touch target recommended by Material guidelines. */
  minTouchTarget: 48,
  buttonHeight: { sm: 36, md: 48, lg: 56 },
  inputHeight: 52,
  iconButton: { sm: 36, md: 44, lg: 56, xl: 72 },
  listItemMinHeight: 64,
  headerHeight: 56,
  tabBarHeight: 64,
  /** Space between the floating tab dock and the bottom inset / mini player. */
  tabBarInset: 8,
  miniPlayerHeight: 64,
  progressBarHeight: 4,
  sliderTrackHeight: 4,
  sliderThumb: 16,
  sliderThumbActive: 22,
  checkbox: 22,
  switchWidth: 46,
  switchHeight: 28,
  chipHeight: 34,
  badgeHeight: 20,
  artwork: { xs: 40, sm: 52, md: 64, lg: 120, xl: 168, hero: 300 },
  avatar: { sm: 32, md: 40, lg: 56 },
  bottomSheetHandle: { width: 40, height: 4 },
  bottomSheetMaxHeightRatio: 0.88,
  maxContentWidth: 640,
  waveformBar: { width: 3, gap: 2, minHeight: 4, maxHeight: 18 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
