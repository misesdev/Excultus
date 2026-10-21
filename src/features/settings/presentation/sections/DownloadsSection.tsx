import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSectionHeader } from '@design-system';
import { useSettings } from '@shared/hooks/useSettings';
import { AUTO_RETRY_OPTIONS, MAX_CONCURRENT_DOWNLOADS_OPTIONS } from '../../index';
import { ChoiceSetting, SwitchSetting } from '../components/SettingRows';

const CONCURRENCY_OPTIONS = MAX_CONCURRENT_DOWNLOADS_OPTIONS.map(value => ({
  value,
  label: String(value),
}));
const RETRY_OPTIONS = AUTO_RETRY_OPTIONS.map(value => ({
  value,
  label: value === 0 ? 'Nunca' : `${value}x`,
}));

export function DownloadsSection() {
  const { settings } = useDependencies();
  const { downloads } = useSettings();
  return (
    <>
      <AppSectionHeader title="Downloads" variant="overline" />
      <ChoiceSetting
        title="Downloads simultâneos"
        icon="layers-outline"
        value={downloads.maxConcurrent}
        options={CONCURRENCY_OPTIONS}
        onChange={maxConcurrent => settings.update({ downloads: { maxConcurrent } })}
      />
      <SwitchSetting
        title="Baixar somente no Wi-Fi"
        subtitle="Downloads aguardam uma rede sem custo"
        icon="wifi-outline"
        value={downloads.wifiOnly}
        onChange={wifiOnly => settings.update({ downloads: { wifiOnly } })}
        testID="setting-wifi-only"
      />
      <ChoiceSetting
        title="Tentativas automáticas"
        icon="refresh-circle-outline"
        value={downloads.autoRetryAttempts}
        options={RETRY_OPTIONS}
        onChange={autoRetryAttempts =>
          settings.update({ downloads: { autoRetryAttempts } })
        }
      />
    </>
  );
}
