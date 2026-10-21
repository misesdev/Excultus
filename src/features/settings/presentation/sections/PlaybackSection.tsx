import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSectionHeader } from '@design-system';
import { formatPercent } from '@core/utils';
import { useSettings } from '@shared/hooks/useSettings';
import {
  COMPLETION_THRESHOLDS,
  PLAYBACK_SPEEDS,
  SKIP_INTERVALS_SEC,
  type SettingsPatch,
} from '../../index';
import { ChoiceSetting, SwitchSetting } from '../components/SettingRows';

const SPEED_OPTIONS = PLAYBACK_SPEEDS.map(speed => ({
  value: speed,
  label: `${String(speed).replace('.', ',')}x`,
}));
const SKIP_OPTIONS = SKIP_INTERVALS_SEC.map(seconds => ({
  value: seconds,
  label: `${seconds} s`,
}));
const COMPLETION_OPTIONS = COMPLETION_THRESHOLDS.map(threshold => ({
  value: threshold,
  label: threshold === 1 ? 'No final' : formatPercent(threshold),
  description:
    threshold === 1
      ? 'Somente ao terminar a faixa'
      : `Ao ouvir ${formatPercent(threshold)} da duração`,
}));

export function PlaybackSection() {
  const { settings } = useDependencies();
  const { playback } = useSettings();
  const update = (patch: SettingsPatch['playback']) =>
    settings.update({ playback: patch });

  return (
    <>
      <AppSectionHeader title="Reprodução" variant="overline" />
      <ChoiceSetting
        title="Velocidade padrão"
        icon="speedometer-outline"
        value={playback.defaultSpeed}
        options={SPEED_OPTIONS}
        onChange={defaultSpeed => update({ defaultSpeed })}
      />
      <ChoiceSetting
        title="Avançar"
        icon="play-forward-outline"
        value={playback.skipForwardSec}
        options={SKIP_OPTIONS}
        onChange={skipForwardSec => update({ skipForwardSec })}
      />
      <ChoiceSetting
        title="Retroceder"
        icon="play-back-outline"
        value={playback.skipBackwardSec}
        options={SKIP_OPTIONS}
        onChange={skipBackwardSec => update({ skipBackwardSec })}
      />
      <SwitchSetting
        title="Reproduzir a próxima automaticamente"
        icon="play-skip-forward-outline"
        value={playback.autoPlayNext}
        onChange={autoPlayNext => update({ autoPlayNext })}
      />
      <ChoiceSetting
        title="Marcar como concluído"
        icon="checkmark-done-outline"
        value={playback.completionThreshold}
        options={COMPLETION_OPTIONS}
        onChange={completionThreshold => update({ completionThreshold })}
      />
      <SwitchSetting
        title="Retomar de onde parou"
        subtitle="Ao abrir um áudio já iniciado"
        icon="refresh-outline"
        value={playback.autoResume}
        onChange={autoResume => update({ autoResume })}
      />
    </>
  );
}
