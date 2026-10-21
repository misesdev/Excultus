import type { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'button'
  | 'mono';

type TypeStyle = Pick<
  TextStyle,
  | 'fontSize'
  | 'lineHeight'
  | 'fontWeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'fontVariant'
>;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const typography: Record<TypographyVariant, TypeStyle> = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.1,
  },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: fontWeights.semibold },
  body: { fontSize: 15, lineHeight: 21, fontWeight: fontWeights.regular },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: fontWeights.semibold },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeights.regular },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: fontWeights.semibold },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
    letterSpacing: 1.2,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  mono: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    fontVariant: ['tabular-nums'],
  },
};

/** Upper bound for system font scaling so layouts stay usable with large fonts. */
export const MAX_FONT_SIZE_MULTIPLIER = 1.6;
