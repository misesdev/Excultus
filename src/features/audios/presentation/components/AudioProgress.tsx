import React from 'react';
import { AppProgressBar } from '@design-system';
import { formatPercent } from '@core/utils';
import {
  progressRatio,
  type AudioLibraryItem,
} from '../../domain/entities/AudioLibraryItem';

/** Listening progress; hidden for audios never played. */
export function AudioProgress({ item }: { item: AudioLibraryItem }) {
  if (!item.progress || (item.progress.positionMs <= 0 && !item.progress.completed)) {
    return null;
  }
  const ratio = progressRatio(item);
  return (
    <AppProgressBar
      progress={ratio}
      color={item.progress.completed ? 'success' : 'primary'}
      height={3}
      accessibilityLabel={`Progresso ${formatPercent(ratio)}`}
    />
  );
}
