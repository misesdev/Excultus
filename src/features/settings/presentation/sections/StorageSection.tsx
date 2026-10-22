import React, { useState } from 'react';
import { View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppDialog,
  AppListItem,
  AppSectionHeader,
  AppSkeleton,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { formatBytes } from '@core/utils';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';

export function StorageSection() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { storage } = useDependencies();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const usage = useQuery(() => storage.getUsage(), [], ['downloads']);

  const cleanTemp = useAsyncAction(async () => {
    const freed = await storage.cleanTemporaryFiles();
    usage.refetch();
    feedback.success(
      freed > 0
        ? t('settings.storage.freed', { size: formatBytes(freed) })
        : t('settings.storage.noTempFiles'),
    );
  });
  const verify = useAsyncAction(async () => {
    const report = await storage.verifyLocalFiles();
    usage.refetch();
    feedback.info(
      report.missing === 0 && report.orphansRemoved === 0
        ? t('settings.storage.allGood', { count: report.checked })
        : `${t('settings.storage.missing', { count: report.missing })} · ${t(
            'settings.storage.orphansRemoved',
            { count: report.orphansRemoved },
          )}`,
    );
  });
  const deleteAll = useAsyncAction(async () => {
    const count = await storage.deleteAllDownloads();
    feedback.success(t('settings.storage.filesRemoved', { count }));
  });

  return (
    <>
      <AppSectionHeader title={t('settings.storage.title')} variant="overline" />
      <View style={styles.usage} testID="storage-usage">
        {usage.data ? (
          <>
            <AppText variant="heading">{formatBytes(usage.data.audioBytes)}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t('settings.storage.usage', {
                files: t('settings.storage.downloadedFiles', {
                  count: usage.data.audioFileCount,
                }),
                covers: formatBytes(usage.data.artworkBytes),
                temp: formatBytes(usage.data.tempBytes),
              })}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {t('imports.freeSpace', { size: formatBytes(usage.data.freeBytes) })}
            </AppText>
          </>
        ) : (
          <AppSkeleton width="60%" height={24} />
        )}
      </View>
      <AppListItem
        title={t('settings.storage.cleanTemp')}
        subtitle={t('settings.storage.cleanTempDescription')}
        leadingIcon="sparkles-outline"
        onPress={() => cleanTemp.run()}
        disabled={cleanTemp.running}
      />
      <AppListItem
        title={t('settings.storage.verify')}
        subtitle={t('settings.storage.verifyDescription')}
        leadingIcon="shield-checkmark-outline"
        onPress={() => verify.run()}
        disabled={verify.running}
      />
      <AppListItem
        title={t('settings.storage.deleteAll')}
        subtitle={t('settings.storage.deleteAllDescription')}
        leadingIcon="trash-outline"
        destructive
        onPress={() => setConfirmDeleteAll(true)}
      />
      <AppDialog
        visible={confirmDeleteAll}
        title={t('settings.storage.deleteAllDialog.title')}
        message={t('settings.storage.deleteAllDialog.message')}
        onDismiss={() => setConfirmDeleteAll(false)}
        actions={[
          {
            label: t('settings.storage.deleteAllDialog.confirm'),
            variant: 'destructive',
            onPress: () => {
              setConfirmDeleteAll(false);
              deleteAll.run();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmDeleteAll(false) },
        ]}
      />
    </>
  );
}

const useStyles = makeStyles(theme => ({
  usage: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
}));
