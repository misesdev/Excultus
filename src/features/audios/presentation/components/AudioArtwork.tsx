import React from 'react';
import { AppArtwork, type AppArtworkProps, useTranslation } from '@design-system';
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
  const { t } = useTranslation();
  return (
    <AppArtwork
      source={audio.artworkPath}
      seed={audio.id}
      size={size}
      radius={radius}
      placeholderIcon={SOURCE_ICONS[audio.sourceType]}
      accessibilityLabel={t('audio.cover', { title: audio.title })}
      testID={testID}
    />
  );
}
