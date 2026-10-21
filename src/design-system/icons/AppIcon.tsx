import React from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import type { ColorPalette, IconSize } from '../tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface AppIconProps {
  name: IconName;
  size?: IconSize | number;
  color?: keyof ColorPalette;
  testID?: string;
}

/** Single entry point for icons; sizes and colors come from tokens. */
export function AppIcon({
  name,
  size = 'md',
  color = 'textPrimary',
  testID,
}: AppIconProps) {
  const theme = useTheme();
  const pixelSize = typeof size === 'number' ? size : theme.iconSizes[size];
  return (
    <Ionicons
      name={name}
      size={pixelSize}
      color={theme.colors[color]}
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
