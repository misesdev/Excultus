import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, makeStyles, useTheme } from '@design-system';
import type { AudioLibraryItem } from '../../domain/entities/AudioLibraryItem';
import { AudioArtwork } from './AudioArtwork';
import { audioDurationLabel } from './AudioDuration';
import { AudioProgress } from './AudioProgress';

export interface AudioCardProps {
  item: AudioLibraryItem;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

/** Large tile used in horizontal shelves ("Continue listening"). */
export function AudioCard({ item, onPress, onLongPress, testID }: AudioCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const detail = audioDurationLabel(item);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[item.audio.title, detail].filter(Boolean).join(', ')}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <AudioArtwork audio={item.audio} size={theme.sizes.artwork.xl} radius="lg" />
      <View style={styles.texts}>
        <AppText variant="captionStrong" numberOfLines={2}>
          {item.audio.title}
        </AppText>
        {detail && (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {detail}
          </AppText>
        )}
        <AudioProgress item={item} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  root: { width: theme.sizes.artwork.xl, gap: theme.spacing.sm },
  pressed: { opacity: theme.opacity.pressed },
  texts: { gap: theme.spacing.xs },
}));
