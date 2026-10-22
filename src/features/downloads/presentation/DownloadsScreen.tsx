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
  useTranslation,
} from '@design-system';
import type { TranslationKey } from '@core/i18n';
import { formatBytes, formatPercent } from '@core/utils';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { listStyles } from '@shared/styles/listStyles';
import type { DownloadListEntry } from '../index';
import { DownloadItem } from './components/DownloadItem';
import { useDownloadsStore } from './downloadsStore';

function SummaryCard({ usedBytes, freeBytes }: { usedBytes: number; freeBytes: number }) {
  const { t } = useTranslation();
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
            {t('downloads.used')}
          </AppText>
          <AppText variant="heading">{formatBytes(usedBytes)}</AppText>
        </View>
        <View style={styles.summaryCell}>
          <AppText variant="overline" color="textMuted" uppercase>
            {t('downloads.free')}
          </AppText>
          <AppText variant="heading">{formatBytes(freeBytes)}</AppText>
        </View>
      </View>
      {aggregate.activeCount > 0 && (
        <View style={styles.aggregate}>
          <AppText variant="caption" color="textSecondary">
            {t('downloads.active', { count: aggregate.activeCount })}
            {aggregate.totalBytes > 0 ? ` · ${formatPercent(aggregate.ratio)}` : ''}
            {waiting ? ` · ${t('downloads.waitingForNetwork')}` : ''}
          </AppText>
          <AppProgressBar
            progress={aggregate.ratio}
            accessibilityLabel={t('downloads.totalProgress')}
          />
        </View>
      )}
      {(hasRunning || hasPaused || hasFailed) && (
        <View style={styles.bulkActions}>
          {hasRunning && (
            <AppButton
              label={t('downloads.pauseAll')}
              size="sm"
              variant="secondary"
              icon="pause"
              onPress={() => downloads.pauseAll()}
            />
          )}
          {hasPaused && (
            <AppButton
              label={t('downloads.resumeAll')}
              size="sm"
              variant="secondary"
              icon="play"
              onPress={() => downloads.resumeAll()}
            />
          )}
          {hasFailed && (
            <AppButton
              label={t('downloads.retryFailed')}
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
  const { t } = useTranslation();
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
      successMessage: t('downloads.fileDeleted'),
    },
  );
  const removeFromLibrary = useAsyncAction(
    (audioId: string) => audios.deleteFromLibrary(audioId),
    { successMessage: t('downloads.removedFromLibrary') },
  );

  const sections = useMemo(() => {
    const entries = data?.entries ?? [];
    const groups: Array<{ title: TranslationKey; data: DownloadListEntry[] }> = [
      {
        title: 'library.filters.inProgress',
        data: entries.filter(entry =>
          ['queued', 'downloading', 'paused'].includes(entry.download.status),
        ),
      },
      {
        title: 'downloads.failed',
        data: entries.filter(entry => entry.download.status === 'failed'),
      },
      {
        title: 'library.filters.downloaded',
        data: entries.filter(entry => entry.download.status === 'completed'),
      },
    ];
    return groups.filter(group => group.data.length > 0);
  }, [data?.entries]);

  return (
    <AppScreen testID="downloads-screen">
      <AppHeader title={t('tabs.downloads')} variant="large" />
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
              title={t(section.title)}
              subtitle={t('player.itemCount', { count: section.data.length })}
            />
          )}
          renderItem={({ item }) => (
            <DownloadItem entry={item} onDeleteFile={setConfirmDelete} />
          )}
          ListEmptyComponent={
            <AppEmptyState
              icon="cloud-download-outline"
              title={t('downloads.empty.title')}
              description={t('downloads.empty.description')}
              actionLabel={t('home.importContent')}
              onAction={() => navigation.navigate(Routes.Import)}
            />
          }
        />
      )}
      <AppDialog
        visible={confirmDelete !== null}
        title={t('downloads.deleteDialog.title')}
        message={t('downloads.deleteDialog.message')}
        onDismiss={() => setConfirmDelete(null)}
        actions={[
          {
            label: t('downloads.deleteDialog.removeFromLibrary'),
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
            label: t('downloads.deleteDialog.deleteFileOnly'),
            variant: 'secondary',
            testID: 'confirm-delete-download',
            onPress: () => {
              if (confirmDelete) {
                deleteFile.run(confirmDelete);
              }
              setConfirmDelete(null);
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmDelete(null) },
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
