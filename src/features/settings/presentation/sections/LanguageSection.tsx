import React from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppSectionHeader, useTranslation } from '@design-system';
import { useSettings } from '@shared/hooks/useSettings';
import { LANGUAGE_OPTIONS, type LanguagePreference } from '../../index';
import { ChoiceSetting } from '../components/SettingRows';

/** Language names stay in their own language so anyone can find theirs. */
const NATIVE_NAMES: Record<Exclude<LanguagePreference, 'system'>, string> = {
  en: 'English',
  pt: 'Português',
};

export function LanguageSection() {
  const { t } = useTranslation();
  const { settings } = useDependencies();
  const { general } = useSettings();
  const options = LANGUAGE_OPTIONS.map(value => ({
    value,
    label: value === 'system' ? t('settings.language.system') : NATIVE_NAMES[value],
    description:
      value === 'system' ? t('settings.language.systemDescription') : undefined,
  }));

  return (
    <>
      <AppSectionHeader title={t('settings.language.title')} variant="overline" />
      <ChoiceSetting
        title={t('settings.language.label')}
        icon="language-outline"
        value={general.language}
        options={options}
        onChange={language => settings.update({ general: { language } })}
        testID="settings-language"
      />
    </>
  );
}
