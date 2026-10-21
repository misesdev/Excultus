import React from 'react';
import { View } from 'react-native';
import { AppProgressBar, AppText, makeStyles } from '@design-system';
import { formatBytes, formatPercent } from '@core/utils';
import { downloadProgress, type DownloadStatus } from '../../index';

const STATUS_LABELS: Record<DownloadStatus, string> = {
  queued: 'Na fila',
  downloading: 'Baixando',
  paused: 'Pausado',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

export interface DownloadProgressProps {
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes?: number;
  /** Extra info, e.g. "aguardando Wi-Fi". */
  note?: string;
}

export function DownloadProgress({
  status,
  bytesDownloaded,
  totalBytes,
  note,
}: DownloadProgressProps) {
  const styles = useStyles();
  const ratio = downloadProgress({ status, bytesDownloaded, totalBytes });
  const sizes = totalBytes
    ? `${formatBytes(bytesDownloaded)} de ${formatBytes(totalBytes)}`
    : formatBytes(bytesDownloaded);
  const color =
    status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'primary';
  return (
    <View style={styles.root}>
      {status !== 'completed' && (
        <AppProgressBar
          progress={ratio}
          color={color}
          accessibilityLabel={`${STATUS_LABELS[status]} ${formatPercent(ratio)}`}
        />
      )}
      <AppText
        variant="caption"
        color={status === 'failed' ? 'error' : 'textSecondary'}
        numberOfLines={1}
      >
        {[
          STATUS_LABELS[status],
          status === 'completed' ? formatBytes(totalBytes) : sizes,
          note,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { gap: theme.spacing.xs },
}));
