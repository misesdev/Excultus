import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { AppIcon, type IconName } from '../icons/AppIcon';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { artworkHues, type componentSizes, type radius as radiusTokens } from '../tokens';

export type ArtworkSize = keyof typeof componentSizes.artwork;

export interface AppArtworkProps {
  /** Absolute local path, file:// URI or https URL. */
  source?: string;
  /** Seed for the deterministic placeholder color (e.g. the entity id). */
  seed: string;
  size?: ArtworkSize | number;
  radius?: keyof typeof radiusTokens;
  placeholderIcon?: IconName;
  accessibilityLabel?: string;
  testID?: string;
}

function hueForSeed(seed: string): string {
  const HASH_MODULUS = 2147483647;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % HASH_MODULUS;
  }
  return artworkHues[hash % artworkHues.length] ?? artworkHues[0];
}

function toImageUri(source: string): string {
  return source.startsWith('/') ? `file://${source}` : source;
}

export function AppArtwork({
  source,
  seed,
  size = 'md',
  radius = 'md',
  placeholderIcon = 'musical-notes',
  accessibilityLabel,
  testID,
}: AppArtworkProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [failed, setFailed] = useState(false);
  const dimension = typeof size === 'number' ? size : theme.sizes.artwork[size];
  const frame = {
    width: dimension,
    height: dimension,
    borderRadius: theme.radius[radius],
  };
  const iconSize = Math.round(dimension * 0.4);

  if (source && !failed) {
    return (
      <Image
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityIgnoresInvertColors
        source={{ uri: toImageUri(source) }}
        style={[styles.image, frame]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.placeholder, frame, { backgroundColor: hueForSeed(seed) }]}
    >
      <View style={[styles.shade, frame]} />
      <AppIcon name={placeholderIcon} size={iconSize} color="textPrimary" />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  image: { backgroundColor: theme.colors.surfaceElevated },
  placeholder: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shade: { position: 'absolute', backgroundColor: theme.colors.overlay, opacity: 0.45 },
}));
