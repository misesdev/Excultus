import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSectionHeader, useTranslation } from '@design-system';
import { formatDecimal, t } from '@core/i18n';
import { formatPercent } from '@core/utils';
import { useSettings } from '@shared/hooks/useSettings';
import {
  COMPLETION_THRESHOLDS,
  PLAYBACK_SPEEDS,
  SKIP_INTERVALS_SEC,
  type SettingsPatch,
} from '../../index';
import { ChoiceSetting, SwitchSetting } from '../components/SettingRows';

const SKIP_OPTIONS = SKIP_INTERVALS_SEC.map(seconds => ({
  value: seconds,
  label: `${seconds} s`,
}));

function speedOptions() {
  return PLAYBACK_SPEEDS.map(speed => ({
    value: speed,
    label: `${formatDecimal(speed)}x`,
  }));
}

function completionOptions() {
  return COMPLETION_THRESHOLDS.map(threshold => ({
    value: threshold,
    label: threshold === 1 ? t('settings.playback.atEnd') : formatPercent(threshold),
    description:
      threshold === 1
        ? t('settings.playback.atEndDescription')
        : t('settings.playback.afterPercent', { percent: formatPercent(threshold) }),
  }));
}

export function PlaybackSection() {
  const { settings } = useDependencies();
  const { playback } = useSettings();
  useTranslation();
  const update = (patch: SettingsPatch['playback']) =>
    settings.update({ playback: patch });

  return (
    <>
      <AppSectionHeader title={t('settings.playback.title')} variant="overline" />
      <ChoiceSetting
        title={t('settings.playback.defaultSpeed')}
        icon="speedometer-outline"
        value={playback.defaultSpeed}
        options={speedOptions()}
        onChange={defaultSpeed => update({ defaultSpeed })}
      />
      <ChoiceSetting
        title={t('settings.playback.skipForward')}
        icon="play-forward-outline"
        value={playback.skipForwardSec}
        options={SKIP_OPTIONS}
        onChange={skipForwardSec => update({ skipForwardSec })}
      />
      <ChoiceSetting
        title={t('settings.playback.skipBackward')}
        icon="play-back-outline"
        value={playback.skipBackwardSec}
        options={SKIP_OPTIONS}
        onChange={skipBackwardSec => update({ skipBackwardSec })}
      />
      <SwitchSetting
        title={t('settings.playback.autoPlayNext')}
        icon="play-skip-forward-outline"
        value={playback.autoPlayNext}
        onChange={autoPlayNext => update({ autoPlayNext })}
      />
      <ChoiceSetting
        title={t('settings.playback.completion')}
        icon="checkmark-done-outline"
        value={playback.completionThreshold}
        options={completionOptions()}
        onChange={completionThreshold => update({ completionThreshold })}
      />
      <SwitchSetting
        title={t('settings.playback.autoResume')}
        subtitle={t('settings.playback.autoResumeDescription')}
        icon="refresh-outline"
        value={playback.autoResume}
        onChange={autoResume => update({ autoResume })}
      />
    </>
  );
}
