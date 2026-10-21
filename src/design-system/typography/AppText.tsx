import React from 'react';
import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import {
  MAX_FONT_SIZE_MULTIPLIER,
  type ColorPalette,
  type TypographyVariant,
} from '../tokens';

export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TypographyVariant;
  color?: keyof ColorPalette;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  uppercase,
  style,
  maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        uppercase ? styles.uppercase : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ uppercase: { textTransform: 'uppercase' } });
