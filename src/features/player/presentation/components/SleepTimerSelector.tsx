import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { t } from '@core/i18n';
import { formatHumanDuration } from '@core/utils';
import { useTranslation } from '@design-system';
import { OptionSheet } from '@shared/components/OptionSheet';
import { createDurationTimer, SLEEP_TIMER_MINUTES, type SleepTimer } from '../../index';
import { usePlayerStore } from '../store/playerStore';

type TimerOption = 'off' | 'end-of-track' | `${number}`;

function timerOptions(): Array<{ value: TimerOption; label: string }> {
  return [
    { value: 'off', label: t('player.timer.off') },
    ...SLEEP_TIMER_MINUTES.map(minutes => ({
      value: `${minutes}` as TimerOption,
      label: formatHumanDuration(minutes * 60 * 1000),
    })),
    { value: 'end-of-track', label: t('player.timer.endOfTrack') },
  ];
}

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
  useTranslation();
  return (
    <OptionSheet
      visible={visible}
      title={t('player.timer.title')}
      options={timerOptions()}
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
