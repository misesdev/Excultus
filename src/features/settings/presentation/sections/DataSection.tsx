import React, { useState } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { AppDialog, AppListItem, AppSectionHeader } from '@design-system';
import { pluralize } from '@core/utils';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import type { BackupScope } from '../../index';

export function DataSection() {
  const { backup, history } = useDependencies();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const exportData = useAsyncAction(async (scope: BackupScope) => {
    const saved = await backup.export(scope);
    if (saved) {
      feedback.success(scope === 'full' ? 'Backup exportado' : 'Metadados exportados');
    }
  });
  const restore = useAsyncAction(async () => {
    const report = await backup.restore();
    if (report) {
      feedback.success(
        `Restaurado: ${pluralize(report.audios, 'áudio', 'áudios')}, ${pluralize(
          report.collections,
          'coleção',
          'coleções',
        )}`,
      );
    }
  });
  const clearHistory = useAsyncAction(() => history.clear(), {
    successMessage: 'Histórico limpo',
  });

  return (
    <>
      <AppSectionHeader title="Dados" variant="overline" />
      <AppListItem
        title="Exportar backup"
        subtitle="Biblioteca, coleções, playlists, progresso, marcadores e ajustes (sem os arquivos de áudio)"
        leadingIcon="save-outline"
        onPress={() => exportData.run('full')}
        disabled={exportData.running}
      />
      <AppListItem
        title="Exportar metadados"
        subtitle="Catálogo de áudios e coleções em JSON"
        leadingIcon="document-text-outline"
        onPress={() => exportData.run('metadata')}
        disabled={exportData.running}
      />
      <AppListItem
        title="Restaurar backup"
        subtitle="Mescla um backup com a biblioteca atual"
        leadingIcon="cloud-upload-outline"
        onPress={() => setConfirmRestore(true)}
        disabled={restore.running}
      />
      <AppListItem
        title="Limpar histórico"
        leadingIcon="time-outline"
        onPress={() => setConfirmClearHistory(true)}
      />
      <AppDialog
        visible={confirmRestore}
        title="Restaurar backup?"
        message="Os dados do arquivo serão mesclados com os atuais; nada existente é apagado. Os arquivos de áudio precisarão ser baixados de novo."
        onDismiss={() => setConfirmRestore(false)}
        actions={[
          {
            label: 'Escolher arquivo',
            variant: 'primary',
            onPress: () => {
              setConfirmRestore(false);
              restore.run();
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmRestore(false) },
        ]}
      />
      <AppDialog
        visible={confirmClearHistory}
        title="Limpar histórico?"
        message="O registro de reproduções será apagado. Posições salvas são mantidas."
        onDismiss={() => setConfirmClearHistory(false)}
        actions={[
          {
            label: 'Limpar',
            variant: 'destructive',
            onPress: () => {
              setConfirmClearHistory(false);
              clearHistory.run();
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmClearHistory(false) },
        ]}
      />
    </>
  );
}
