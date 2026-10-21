import React, { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation } from '@app/navigation/routes';
import {
  AppButton,
  AppCard,
  AppDialog,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppListSkeleton,
  AppProgressBar,
  AppScreen,
  AppSectionHeader,
  AppText,
  makeStyles,
} from '@design-system';
import { formatBytes, formatPercent, pluralize } from '@core/utils';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';
import type { DownloadListEntry } from '../index';
import { DownloadItem } from './components/DownloadItem';
import { useDownloadsStore } from './downloadsStore';

function SummaryCard({ usedBytes, freeBytes }: { usedBytes: number; freeBytes: number }) {
  const styles = useStyles();
  const { downloads } = useDependencies();
  const aggregate = useDownloadsStore(state => state.aggregate);
  const waiting = useDownloadsStore(state => state.waitingForNetwork);
  // Selectors return primitives so Zustand only re-renders on real changes.
  const hasRunning = useDownloadsStore(state =>
    Object.values(state.byAudioId).some(
      item => item.status === 'downloading' || item.status === 'queued',
    ),
  );
  const hasPaused = useDownloadsStore(state =>
    Object.values(state.byAudioId).some(item => item.status === 'paused'),
  );
  const hasFailed = useDownloadsStore(state =>
    Object.values(state.byAudioId).some(item => item.status === 'failed'),
  );

  return (
    <AppCard style={styles.card}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <AppText variant="overline" color="textMuted" uppercase>
            Usado
          </AppText>
          <AppText variant="heading">{formatBytes(usedBytes)}</AppText>
        </View>
        <View style={styles.summaryCell}>
          <AppText variant="overline" color="textMuted" uppercase>
            Livre
          </AppText>
          <AppText variant="heading">{formatBytes(freeBytes)}</AppText>
        </View>
      </View>
      {aggregate.activeCount > 0 && (
        <View style={styles.aggregate}>
          <AppText variant="caption" color="textSecondary">
            {pluralize(aggregate.activeCount, 'download ativo', 'downloads ativos')}
            {aggregate.totalBytes > 0 ? ` · ${formatPercent(aggregate.ratio)}` : ''}
            {waiting ? ' · aguardando conexão permitida' : ''}
          </AppText>
          <AppProgressBar
            progress={aggregate.ratio}
            accessibilityLabel="Progresso total dos downloads"
          />
        </View>
      )}
      {(hasRunning || hasPaused || hasFailed) && (
        <View style={styles.bulkActions}>
          {hasRunning && (
            <AppButton
              label="Pausar tudo"
              size="sm"
              variant="secondary"
              icon="pause"
              onPress={() => downloads.pauseAll()}
            />
          )}
          {hasPaused && (
            <AppButton
              label="Retomar tudo"
              size="sm"
              variant="secondary"
              icon="play"
              onPress={() => downloads.resumeAll()}
            />
          )}
          {hasFailed && (
            <AppButton
              label="Tentar falhas"
              size="sm"
              variant="secondary"
              icon="refresh"
              onPress={() => downloads.retryAllFailed()}
            />
          )}
        </View>
      )}
    </AppCard>
  );
}

export function DownloadsScreen() {
  const navigation = useAppNavigation();
  const { storage, downloads, audios } = useDependencies();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data, loading, error, refetch, refreshing } = useQuery(
    async () => ({
      entries: await storage.listDownloads(),
      usage: await storage.getUsage(),
    }),
    [],
    ['downloads'],
  );
  const deleteFile = useAsyncAction(
    (audioId: string) => downloads.deleteDownloadedFile(audioId),
    {
      successMessage: 'Arquivo removido. O áudio continua na biblioteca.',
    },
  );
  const removeFromLibrary = useAsyncAction(
    (audioId: string) => audios.deleteFromLibrary(audioId),
    { successMessage: 'Áudio removido da biblioteca, das playlists e das coleções.' },
  );

  const sections = useMemo(() => {
    const entries = data?.entries ?? [];
    const groups: Array<{ title: string; data: DownloadListEntry[] }> = [
      {
        title: 'Em andamento',
        data: entries.filter(entry =>
          ['queued', 'downloading', 'paused'].includes(entry.download.status),
        ),
      },
      {
        title: 'Com falha',
        data: entries.filter(entry => entry.download.status === 'failed'),
      },
      {
        title: 'Baixados',
        data: entries.filter(entry => entry.download.status === 'completed'),
      },
    ];
    return groups.filter(group => group.data.length > 0);
  }, [data?.entries]);

  return (
    <AppScreen testID="downloads-screen">
      <AppHeader title="Downloads" variant="large" />
      {loading && !data ? (
        <AppListSkeleton />
      ) : error && !data ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={entry => entry.download.id}
          onRefresh={refetch}
          refreshing={refreshing}
          contentContainerStyle={listStyles.grow}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            data ? (
              <SummaryCard
                usedBytes={data.usage.audioBytes}
                freeBytes={data.usage.freeBytes}
              />
            ) : undefined
          }
          renderSectionHeader={({ section }) => (
            <AppSectionHeader
              title={section.title}
              subtitle={pluralize(section.data.length, 'item', 'itens')}
            />
          )}
          renderItem={({ item }) => (
            <DownloadItem entry={item} onDeleteFile={setConfirmDelete} />
          )}
          ListEmptyComponent={
            <AppEmptyState
              icon="cloud-download-outline"
              title="Nenhum download"
              description="Importe conteúdos e baixe-os para ouvir sem internet."
              actionLabel="Importar conteúdo"
              onAction={() => navigation.navigate(Routes.Import)}
            />
          }
        />
      )}
      <AppDialog
        visible={confirmDelete !== null}
        title="Excluir download?"
        message="Apagar só o arquivo mantém o áudio na biblioteca, nas playlists e nas coleções, com progresso e marcadores, para baixar de novo depois. Remover da biblioteca apaga tudo isso."
        onDismiss={() => setConfirmDelete(null)}
        actions={[
          {
            label: 'Remover da biblioteca',
            variant: 'destructive',
            testID: 'confirm-remove-from-library',
            onPress: () => {
              if (confirmDelete) {
                removeFromLibrary.run(confirmDelete);
              }
              setConfirmDelete(null);
            },
          },
          {
            label: 'Apagar só o arquivo',
            variant: 'secondary',
            testID: 'confirm-delete-download',
            onPress: () => {
              if (confirmDelete) {
                deleteFile.run(confirmDelete);
              }
              setConfirmDelete(null);
            },
          },
          { label: 'Cancelar', onPress: () => setConfirmDelete(null) },
        ]}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  card: { marginHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.lg },
  summaryCell: { flex: 1, gap: theme.spacing.xs },
  aggregate: { gap: theme.spacing.sm },
  bulkActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
