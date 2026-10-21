import { Easing, type ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export const elevation = {
  none: 0,
  low: 2,
  medium: 6,
  high: 12,
} as const;

export const shadows: Record<keyof typeof elevation, ShadowStyle> = {
  none: { elevation: elevation.none },
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: elevation.low,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: elevation.medium,
  },
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: elevation.high,
  },
};

export const durations = {
  instant: 80,
  fast: 160,
  normal: 240,
  slow: 360,
  skeletonPulse: 900,
  toast: 3200,
} as const;

export const easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0, 0, 0, 1),
  accelerate: Easing.bezier(0.3, 0, 1, 1),
  inOut: Easing.inOut(Easing.ease),
} as const;
