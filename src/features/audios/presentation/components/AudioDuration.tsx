import React from 'react';
import { t } from '@core/i18n';
import { AppText, useTranslation, type AppTextProps } from '@design-system';
import { formatHumanDuration } from '@core/utils';
import type { AudioLibraryItem } from '../../domain/entities/AudioLibraryItem';

/** Total duration, or the remaining time for an audio in progress. */
export function audioDurationLabel(item: AudioLibraryItem): string | undefined {
  const duration = item.audio.durationMs ?? item.progress?.durationMs;
  if (!duration) {
    return undefined;
  }
  if (item.progress?.completed) {
    return t('audio.completed');
  }
  if (item.progress && item.progress.positionMs > 0) {
    return t('audio.remaining', {
      duration: formatHumanDuration(Math.max(0, duration - item.progress.positionMs)),
    });
  }
  return formatHumanDuration(duration);
}

export function AudioDuration({
  item,
  ...textProps
}: { item: AudioLibraryItem } & Omit<AppTextProps, 'children'>) {
  useTranslation();
  const label = audioDurationLabel(item);
  if (!label) {
    return null;
  }
  return (
    <AppText variant="caption" color="textSecondary" {...textProps}>
      {label}
    </AppText>
  );
}
