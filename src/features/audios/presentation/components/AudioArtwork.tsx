import React from 'react';
import { AppArtwork, type AppArtworkProps } from '@design-system';
import type { Audio } from '../../domain/entities/Audio';

const SOURCE_ICONS = {
  archive: 'library',
  youtube: 'logo-youtube',
  local: 'phone-portrait',
  direct: 'link',
} as const;

export interface AudioArtworkProps
  extends Pick<AppArtworkProps, 'size' | 'radius' | 'testID'> {
  audio: Pick<Audio, 'id' | 'artworkPath' | 'sourceType' | 'title'>;
}

export function AudioArtwork({ audio, size, radius, testID }: AudioArtworkProps) {
  return (
    <AppArtwork
      source={audio.artworkPath}
      seed={audio.id}
      size={size}
      radius={radius}
      placeholderIcon={SOURCE_ICONS[audio.sourceType]}
      accessibilityLabel={`Capa de ${audio.title}`}
      testID={testID}
    />
  );
}
