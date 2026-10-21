import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { formatHumanDuration } from '@core/utils';
import { OptionSheet } from '@shared/components/OptionSheet';
import { createDurationTimer, SLEEP_TIMER_MINUTES, type SleepTimer } from '../../index';
import { usePlayerStore } from '../store/playerStore';

type TimerOption = 'off' | 'end-of-track' | `${number}`;

const OPTIONS: Array<{ value: TimerOption; label: string }> = [
  { value: 'off', label: 'Desligado' },
  ...SLEEP_TIMER_MINUTES.map(minutes => ({
    value: `${minutes}` as TimerOption,
    label: formatHumanDuration(minutes * 60 * 1000),
  })),
  { value: 'end-of-track', label: 'Ao fim da faixa atual' },
];

function toOption(timer: SleepTimer | undefined): TimerOption {
  if (!timer) {
    return 'off';
  }
  return timer.kind === 'end-of-track'
    ? 'end-of-track'
    : (`${timer.minutes}` as TimerOption);
}

export function SleepTimerSelector({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { player } = useDependencies();
  const timer = usePlayerStore(state => state.sleepTimer);
  return (
    <OptionSheet
      visible={visible}
      title="Temporizador"
      options={OPTIONS}
      selected={toOption(timer)}
      onClose={onClose}
      onSelect={value => {
        if (value === 'off') {
          player.setSleepTimer(null);
        } else if (value === 'end-of-track') {
          player.setSleepTimer({ kind: 'end-of-track' });
        } else {
          player.setSleepTimer(createDurationTimer(Number(value), Date.now()));
        }
      }}
    />
  );
}
