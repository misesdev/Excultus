import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { PLAYBACK_SPEEDS } from '@features/settings';
import { OptionSheet } from '@shared/components/OptionSheet';
import { usePlayerStore } from '../store/playerStore';

export function formatSpeed(speed: number): string {
  return `${speed.toString().replace('.', ',')}x`;
}

const OPTIONS = PLAYBACK_SPEEDS.map(speed => ({
  value: speed,
  label: formatSpeed(speed),
  description: speed === 1 ? 'Velocidade normal' : undefined,
}));

export function PlaybackSpeedSelector({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { player } = useDependencies();
  const rate = usePlayerStore(state => state.rate);
  return (
    <OptionSheet
      visible={visible}
      title="Velocidade de reprodução"
      options={OPTIONS}
      selected={rate}
      onSelect={speed => player.setSpeed(speed)}
      onClose={onClose}
    />
  );
}
