import React from 'react';
import { View } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';

export interface AppAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map(part => part?.[0] ?? '')
    .join('')
    .toUpperCase();
}

export function AppAvatar({ name, size = 'md' }: AppAvatarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const dimension = theme.sizes.avatar[size];
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.avatar,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    >
      <AppText variant={size === 'lg' ? 'heading' : 'captionStrong'} color="primary">
        {initials(name)}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  avatar: {
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
