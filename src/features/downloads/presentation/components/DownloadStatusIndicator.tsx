import React from 'react';
import { View } from 'react-native';
import { AppIcon, AppText, makeStyles } from '@design-system';
import type { OfflineState } from '@features/audios';
import { formatPercent } from '@core/utils';
import { downloadProgress } from '../../index';
import { useActiveDownload } from '../downloadsStore';

/**
 * Compact offline indicator for list rows. Live progress comes from the
 * download runtime; persisted state is the fallback.
 */
export function DownloadStatusIndicator({
  audioId,
  offline,
}: {
  audioId: string;
  offline: OfflineState;
}) {
  const styles = useStyles();
  const active = useActiveDownload(audioId);
  const status = active?.status;

  if (status === 'downloading' && active) {
    const ratio = downloadProgress(active);
    return (
      <View style={styles.root} accessibilityLabel={`Baixando ${formatPercent(ratio)}`}>
        <AppText variant="mono" color="primary">
          {formatPercent(ratio)}
        </AppText>
      </View>
    );
  }
  if (
    status === 'queued' ||
    status === 'paused' ||
    offline === 'queued' ||
    offline === 'paused'
  ) {
    return (
      <View
        style={styles.root}
        accessibilityLabel={
          status === 'paused' ? 'Download pausado' : 'Na fila de download'
        }
      >
        <AppIcon
          name={
            status === 'paused' || offline === 'paused'
              ? 'pause-circle-outline'
              : 'time-outline'
          }
          size="sm"
          color="textMuted"
        />
      </View>
    );
  }
  if (status === 'failed' || offline === 'failed') {
    return (
      <View style={styles.root} accessibilityLabel="Download com falha">
        <AppIcon name="alert-circle-outline" size="sm" color="error" />
      </View>
    );
  }
  if (offline === 'available') {
    return (
      <View style={styles.root} accessibilityLabel="Disponível offline">
        <AppIcon name="arrow-down-circle" size="sm" color="success" />
      </View>
    );
  }
  return null;
}

const useStyles = makeStyles(theme => ({
  root: { minWidth: theme.iconSizes.md, alignItems: 'center' },
}));
