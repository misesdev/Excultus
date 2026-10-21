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
} from '@design-system';
import { DataSection } from './sections/DataSection';
import { DownloadsSection } from './sections/DownloadsSection';
import { PlaybackSection } from './sections/PlaybackSection';
import { StorageSection } from './sections/StorageSection';

const APP_VERSION = '1.0.0';

export function SettingsScreen() {
  const styles = useStyles();
  return (
    <AppScreen scrollable safeTop testID="settings-screen">
      <AppHeader title="Configurações" variant="large" />
      <PlaybackSection />
      <DownloadsSection />
      <StorageSection />

      <AppSectionHeader title="Aparência" variant="overline" />
      <AppListItem
        title="Tema escuro"
        leadingIcon="moon-outline"
        selected
        trailing={<AppIcon name="checkmark" color="primary" />}
      />
      <AppListItem
        title="Tema claro"
        leadingIcon="sunny-outline"
        disabled
        trailing={<AppBadge label="Em breve" />}
      />
      <AppListItem
        title="Cor de destaque"
        leadingIcon="color-palette-outline"
        disabled
        trailing={<AppBadge label="Em breve" />}
      />

      <DataSection />

      <AppText variant="caption" color="textMuted" align="center" style={styles.footer}>
        Excultus {APP_VERSION} · tudo fica no seu dispositivo, sem conta e sem
        rastreamento.
      </AppText>
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  footer: { padding: theme.spacing.xl },
}));
