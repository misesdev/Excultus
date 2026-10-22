import React, { memo } from 'react';
import { View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppArtwork,
  AppIconButton,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { getUserMessageForCode, type ErrorCode } from '@core/errors';
import {
  canCancel,
  canPause,
  canResume,
  canRetry,
  type DownloadErrorCode,
  type DownloadListEntry,
} from '../../index';
import { useActiveDownload } from '../downloadsStore';
import { DownloadProgress } from './DownloadProgress';

const ERROR_CODES: Record<DownloadErrorCode, ErrorCode> = {
  network: 'network',
  http: 'source-unavailable',
  'insufficient-storage': 'insufficient-storage',
  integrity: 'download-failed',
  io: 'download-failed',
  'file-missing': 'file-not-found',
  'source-unavailable': 'source-unavailable',
};

export interface DownloadItemProps {
  entry: DownloadListEntry;
  onDeleteFile: (audioId: string) => void;
}

function DownloadItemComponent({ entry, onDeleteFile }: DownloadItemProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { downloads } = useDependencies();
  const live = useActiveDownload(entry.download.audioId);
  const status = live?.status ?? entry.download.status;
  const audioId = entry.download.audioId;
  const errorCode = live?.errorCode ?? entry.download.errorCode;

  return (
    <View style={styles.root} testID={`download-${audioId}`}>
      <AppArtwork source={entry.artworkPath} seed={audioId} size="sm" />
      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {entry.title}
        </AppText>
        <DownloadProgress
          status={status}
          bytesDownloaded={live?.bytesDownloaded ?? entry.download.bytesDownloaded}
          totalBytes={live?.totalBytes ?? entry.download.totalBytes}
        />
        {status === 'failed' && errorCode && (
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {getUserMessageForCode(ERROR_CODES[errorCode])}
          </AppText>
        )}
      </View>
      <View style={styles.actions}>
        {canPause(status) && (
          <AppIconButton
            icon="pause"
            size="sm"
            accessibilityLabel={t('audioActions.pauseDownload')}
            onPress={() => downloads.pause(audioId)}
          />
        )}
        {canResume(status) && (
          <AppIconButton
            icon="play"
            size="sm"
            accessibilityLabel={t('audioActions.resumeDownload')}
            onPress={() => downloads.resume(audioId)}
          />
        )}
        {canRetry(status) && (
          <AppIconButton
            icon="refresh"
            size="sm"
            accessibilityLabel={t('common.retry')}
            onPress={() => downloads.retry(audioId)}
          />
        )}
        {canCancel(status) && (
          <AppIconButton
            icon="close"
            size="sm"
            color="textSecondary"
            accessibilityLabel={t('downloads.cancel')}
            onPress={() => downloads.cancel(audioId)}
          />
        )}
        {status === 'completed' && (
          <AppIconButton
            icon="trash-outline"
            size="sm"
            color="textSecondary"
            accessibilityLabel={t('downloads.deleteFile')}
            onPress={() => onDeleteFile(audioId)}
            testID={`download-delete-${audioId}`}
          />
        )}
      </View>
    </View>
  );
}

export const DownloadItem = memo(DownloadItemComponent);

const useStyles = makeStyles(theme => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  body: { flex: 1, gap: theme.spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center' },
}));
