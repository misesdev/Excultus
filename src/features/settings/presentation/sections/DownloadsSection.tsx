import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSectionHeader, useTranslation } from '@design-system';
import { useSettings } from '@shared/hooks/useSettings';
import { AUTO_RETRY_OPTIONS, MAX_CONCURRENT_DOWNLOADS_OPTIONS } from '../../index';
import { ChoiceSetting, SwitchSetting } from '../components/SettingRows';

const CONCURRENCY_OPTIONS = MAX_CONCURRENT_DOWNLOADS_OPTIONS.map(value => ({
  value,
  label: String(value),
}));

export function DownloadsSection() {
  const { t } = useTranslation();
  const { settings } = useDependencies();
  const { downloads } = useSettings();
  return (
    <>
      <AppSectionHeader title={t('tabs.downloads')} variant="overline" />
      <ChoiceSetting
        title={t('settings.downloads.concurrent')}
        icon="layers-outline"
        value={downloads.maxConcurrent}
        options={CONCURRENCY_OPTIONS}
        onChange={maxConcurrent => settings.update({ downloads: { maxConcurrent } })}
      />
      <SwitchSetting
        title={t('settings.downloads.wifiOnly')}
        subtitle={t('settings.downloads.wifiOnlyDescription')}
        icon="wifi-outline"
        value={downloads.wifiOnly}
        onChange={wifiOnly => settings.update({ downloads: { wifiOnly } })}
        testID="setting-wifi-only"
      />
      <ChoiceSetting
        title={t('settings.downloads.autoRetry')}
        icon="refresh-circle-outline"
        value={downloads.autoRetryAttempts}
        options={AUTO_RETRY_OPTIONS.map(value => ({
          value,
          label: value === 0 ? t('settings.downloads.never') : `${value}x`,
        }))}
        onChange={autoRetryAttempts =>
          settings.update({ downloads: { autoRetryAttempts } })
        }
      />
    </>
  );
}
