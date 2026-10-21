import React from 'react';
import { View } from 'react-native';
import { AppText, makeStyles } from '@design-system';
import type { Audio } from '../../domain/entities/Audio';

export function audioSubtitle(
  audio: Pick<Audio, 'artist' | 'album'>,
): string | undefined {
  const parts = [audio.artist, audio.album].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export interface AudioMetadataProps {
  audio: Pick<Audio, 'title' | 'artist' | 'album'>;
  /** Extra line content (duration, status...). */
  detail?: React.ReactNode;
  highlighted?: boolean;
  size?: 'regular' | 'large';
}

export function AudioMetadata({
  audio,
  detail,
  highlighted = false,
  size = 'regular',
}: AudioMetadataProps) {
  const styles = useStyles();
  const subtitle = audioSubtitle(audio);
  return (
    <View style={styles.root}>
      <AppText
        variant={size === 'large' ? 'title' : 'bodyStrong'}
        color={highlighted ? 'primary' : 'textPrimary'}
        numberOfLines={2}
      >
        {audio.title}
      </AppText>
      {subtitle && (
        <AppText
          variant={size === 'large' ? 'body' : 'caption'}
          color="textSecondary"
          numberOfLines={1}
        >
          {subtitle}
        </AppText>
      )}
      {detail}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { flex: 1, gap: theme.spacing.xxs },
}));
