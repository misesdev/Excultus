import React from 'react';
import {
  AppBadge,
  AppHeader,
  AppIcon,
  AppListItem,
  AppScreen,
  AppSectionHeader,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import packageJson from '../../../../package.json';
import { DataSection } from './sections/DataSection';
import { DownloadsSection } from './sections/DownloadsSection';
import { LanguageSection } from './sections/LanguageSection';
import { PlaybackSection } from './sections/PlaybackSection';
import { StorageSection } from './sections/StorageSection';

const APP_VERSION = packageJson.version;

export function SettingsScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <AppScreen scrollable safeTop testID="settings-screen">
      <AppHeader title={t('settings.title')} variant="large" />
      <PlaybackSection />
      <DownloadsSection />
      <StorageSection />

      <LanguageSection />

      <AppSectionHeader title={t('settings.appearance.title')} variant="overline" />
      <AppListItem
        title={t('settings.appearance.dark')}
        leadingIcon="moon-outline"
        selected
        trailing={<AppIcon name="checkmark" color="primary" />}
      />
      <AppListItem
        title={t('settings.appearance.light')}
        leadingIcon="sunny-outline"
        disabled
        trailing={<AppBadge label={t('settings.comingSoon')} />}
      />
      <AppListItem
        title={t('settings.appearance.accent')}
        leadingIcon="color-palette-outline"
        disabled
        trailing={<AppBadge label={t('settings.comingSoon')} />}
      />

      <DataSection />

      <AppText variant="caption" color="textMuted" align="center" style={styles.footer}>
        {t('settings.footer', { version: APP_VERSION })}
      </AppText>
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  footer: { padding: theme.spacing.xl },
}));
