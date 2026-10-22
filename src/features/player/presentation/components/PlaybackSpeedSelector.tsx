import React from 'react';
import { formatDecimal } from '@core/i18n';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { PLAYBACK_SPEEDS } from '@features/settings';
import { OptionSheet } from '@shared/components/OptionSheet';
import { usePlayerStore } from '../store/playerStore';
import { useTranslation } from '@design-system';

export function formatSpeed(speed: number): string {
  return `${formatDecimal(speed)}x`;
}

export function PlaybackSpeedSelector({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { player } = useDependencies();
  const rate = usePlayerStore(state => state.rate);
  const options = PLAYBACK_SPEEDS.map(speed => ({
    value: speed,
    label: formatSpeed(speed),
    description: speed === 1 ? t('player.normalSpeed') : undefined,
  }));
  return (
    <OptionSheet
      visible={visible}
      title={t('player.speedTitle')}
      options={options}
      selected={rate}
      onSelect={speed => player.setSpeed(speed)}
      onClose={onClose}
    />
  );
}
