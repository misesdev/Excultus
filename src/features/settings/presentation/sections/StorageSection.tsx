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
} from '@design-system';
import { formatBytes, pluralize } from '@core/utils';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';

export function StorageSection() {
  const styles = useStyles();
  const { storage } = useDependencies();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const usage = useQuery(() => storage.getUsage(), [], ['downloads']);

  const cleanTemp = useAsyncAction(async () => {
    const freed = await storage.cleanTemporaryFiles();
    usage.refetch();
    feedback.success(
      freed > 0
        ? `${formatBytes(freed)} liberados`
        : 'Nenhum arquivo temporário sobrando',
    );
  });
  const verify = useAsyncAction(async () => {
    const report = await storage.verifyLocalFiles();
    usage.refetch();
    feedback.info(
      report.missing === 0 && report.orphansRemoved === 0
        ? `Tudo certo: ${pluralize(
            report.checked,
            'arquivo verificado',
            'arquivos verificados',
          )}`
        : `${pluralize(
            report.missing,
            'arquivo ausente',
            'arquivos ausentes',
          )} · ${pluralize(report.orphansRemoved, 'órfão removido', 'órfãos removidos')}`,
    );
  });
  const deleteAll = useAsyncAction(async () => {
    const count = await storage.deleteAllDownloads();
    feedback.success(`${pluralize(count, 'arquivo removido', 'arquivos removidos')}`);
  });

  return (
    <>
      <AppSectionHeader title="Armazenamento" variant="overline" />
      <View style={styles.usage} testID="storage-usage">
        {usage.data ? (
          <>
            <AppText variant="heading">{formatBytes(usage.data.audioBytes)}</AppText>
            <AppText variant="caption" color="textSecondary">
              {pluralize(
                usage.data.audioFileCount,
                'arquivo baixado',
                'arquivos baixados',
              )}{' '}
              · capas {formatBytes(usage.data.artworkBytes)} · temporários{' '}
              {formatBytes(usage.data.tempBytes)}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {formatBytes(usage.data.freeBytes)} livres no dispositivo
            </AppText>
          </>
        ) : (
          <AppSkeleton width="60%" height={24} />
        )}
      </View>
      <AppListItem
        title="Limpar arquivos temporários"
        subtitle="Remove downloads parciais que não serão retomados"
        leadingIcon="sparkles-outline"
        onPress={() => cleanTemp.run()}
        disabled={cleanTemp.running}
      />
      <AppListItem
        title="Verificar arquivos"
        subtitle="Detecta arquivos ausentes e remove órfãos"
        leadingIcon="shield-checkmark-outline"
        onPress={() => verify.run()}
        disabled={verify.running}
      />
      <AppListItem
        title="Excluir todos os downloads"
        subtitle="Mantém a biblioteca, progresso e marcadores"
        leadingIcon="trash-outline"
        destructive
        onPress={() => setConfirmDeleteAll(true)}
      />
      <AppDialog
        visible={confirmDeleteAll}
        title="Excluir todos os downloads?"
        message="Todos os arquivos de áudio baixados serão apagados. Nada será removido da biblioteca."
        onDismiss={() => setConfirmDeleteAll(false)}
        actions={[
          {
            label: 'Excluir downloads',
            variant: 'destructive',
            onPress: () => {
              setConfirmDeleteAll(false);
              deleteAll.run();
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmDeleteAll(false) },
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
