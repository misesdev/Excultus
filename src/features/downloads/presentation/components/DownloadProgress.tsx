import React from 'react';
import { View } from 'react-native';
import { AppProgressBar, AppText, makeStyles, useTranslation } from '@design-system';
import type { TranslationKey } from '@core/i18n';
import { formatBytes, formatPercent } from '@core/utils';
import { downloadProgress, type DownloadStatus } from '../../index';

const STATUS_LABELS: Record<DownloadStatus, TranslationKey> = {
  queued: 'downloads.status.queued',
  downloading: 'downloads.status.downloading',
  paused: 'downloads.status.paused',
  completed: 'downloads.status.completed',
  failed: 'downloads.status.failed',
  cancelled: 'downloads.status.cancelled',
};

export interface DownloadProgressProps {
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes?: number;
  /** Extra info, e.g. "waiting for Wi-Fi". */
  note?: string;
}

export function DownloadProgress({
  status,
  bytesDownloaded,
  totalBytes,
  note,
}: DownloadProgressProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const ratio = downloadProgress({ status, bytesDownloaded, totalBytes });
  const sizes = totalBytes
    ? t('downloads.sizeOf', {
        downloaded: formatBytes(bytesDownloaded),
        total: formatBytes(totalBytes),
      })
    : formatBytes(bytesDownloaded);
  const color =
    status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'primary';
  return (
    <View style={styles.root}>
      {status !== 'completed' && (
        <AppProgressBar
          progress={ratio}
          color={color}
          accessibilityLabel={`${t(STATUS_LABELS[status])} ${formatPercent(ratio)}`}
        />
      )}
      <AppText
        variant="caption"
        color={status === 'failed' ? 'error' : 'textSecondary'}
        numberOfLines={1}
      >
        {[
          t(STATUS_LABELS[status]),
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
