import React, { useState } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppDialog, AppListItem, AppSectionHeader, useTranslation } from '@design-system';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import type { BackupScope } from '../../index';

export function DataSection() {
  const { t } = useTranslation();
  const { backup, history } = useDependencies();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const exportData = useAsyncAction(async (scope: BackupScope) => {
    const saved = await backup.export(scope);
    if (saved) {
      feedback.success(
        scope === 'full'
          ? t('settings.data.backupExported')
          : t('settings.data.metadataExported'),
      );
    }
  });
  const restore = useAsyncAction(async () => {
    const report = await backup.restore();
    if (report) {
      feedback.success(
        t('settings.data.restored', {
          audios: t('common.audioCount', { count: report.audios }),
          collections: t('settings.data.collectionCount', { count: report.collections }),
        }),
      );
    }
  });
  const clearHistory = useAsyncAction(() => history.clear(), {
    successMessage: t('history.cleared'),
  });

  return (
    <>
      <AppSectionHeader title={t('settings.data.title')} variant="overline" />
      <AppListItem
        title={t('settings.data.exportBackup')}
        subtitle={t('settings.data.exportBackupDescription')}
        leadingIcon="save-outline"
        onPress={() => exportData.run('full')}
        disabled={exportData.running}
      />
      <AppListItem
        title={t('settings.data.exportMetadata')}
        subtitle={t('settings.data.exportMetadataDescription')}
        leadingIcon="document-text-outline"
        onPress={() => exportData.run('metadata')}
        disabled={exportData.running}
      />
      <AppListItem
        title={t('settings.data.restore')}
        subtitle={t('settings.data.restoreDescription')}
        leadingIcon="cloud-upload-outline"
        onPress={() => setConfirmRestore(true)}
        disabled={restore.running}
      />
      <AppListItem
        title={t('history.clear')}
        leadingIcon="time-outline"
        onPress={() => setConfirmClearHistory(true)}
      />
      <AppDialog
        visible={confirmRestore}
        title={t('settings.data.restoreDialog.title')}
        message={t('settings.data.restoreDialog.message')}
        onDismiss={() => setConfirmRestore(false)}
        actions={[
          {
            label: t('settings.data.restoreDialog.chooseFile'),
            variant: 'primary',
            onPress: () => {
              setConfirmRestore(false);
              restore.run();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmRestore(false) },
        ]}
      />
      <AppDialog
        visible={confirmClearHistory}
        title={t('history.clearDialog.title')}
        message={t('settings.data.clearHistoryMessage')}
        onDismiss={() => setConfirmClearHistory(false)}
        actions={[
          {
            label: t('history.clearDialog.confirm'),
            variant: 'destructive',
            onPress: () => {
              setConfirmClearHistory(false);
              clearHistory.run();
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmClearHistory(false) },
        ]}
      />
    </>
  );
}
