import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppErrorState,
  AppHeader,
  AppIcon,
  AppListItem,
  AppLoadingIndicator,
  AppScreen,
  AppSwitch,
  AppText,
  makeStyles,
  useTheme,
} from '@design-system';
import { getUserMessage } from '@core/errors';
import { formatBytes, pluralize } from '@core/utils';
import { feedback } from '@shared/feedback/feedbackStore';
import { useQuery } from '@shared/hooks/useQuery';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { isSelectable, type SourceAudioItem } from '../index';
import { ImportItemRow } from './components/ImportItemRow';
import { ImportPreview } from './components/ImportPreview';
import { ImportTargetSheet } from './components/ImportTargetSheet';
import { ImportUrlForm } from './components/ImportUrlForm';
import { useImportViewModel } from './view-models/useImportViewModel';

export function ImportScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const initialCollectionId = useAppRoute<typeof Routes.Import>().params?.collectionId;
  const { collections, logger } = useDependencies();
  const vm = useImportViewModel(initialCollectionId);
  const [targetSheet, setTargetSheet] = useState(false);
  const collectionsQuery = useQuery(() => collections.list(), [], ['collections']);

  const renderItem = useCallback(
    ({ item }: { item: SourceAudioItem }) => (
      <ImportItemRow
        item={item}
        selected={vm.selection.has(item.sourceId)}
        onToggle={vm.toggle}
      />
    ),
    [vm.selection, vm.toggle],
  );

  const targetLabel = (() => {
    if (vm.target.kind === 'new') {
      return `Nova coleção: ${vm.target.name}`;
    }
    if (vm.target.kind === 'existing') {
      const targetId = vm.target.collectionId;
      const found = collectionsQuery.data?.find(
        summary => summary.collection.id === targetId,
      );
      return found ? `Coleção: ${found.collection.name}` : 'Coleção existente';
    }
    return 'Sem coleção (apenas biblioteca)';
  })();

  const onConfirm = async () => {
    try {
      const result = await vm.confirm();
      if (!result) {
        return;
      }
      feedback.success(
        `${pluralize(result.audioIds.length, 'áudio importado', 'áudios importados')}` +
          (result.enqueuedDownloads > 0
            ? ` · ${result.enqueuedDownloads} na fila de download`
            : ''),
      );
      if (result.collectionId && !initialCollectionId) {
        navigation.replace(Routes.CollectionDetail, {
          collectionId: result.collectionId,
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      logger.error('import.confirm_failed', {}, error);
      feedback.error(getUserMessage(error));
    }
  };

  const { phase } = vm;
  return (
    <AppScreen keyboardAware testID="import-screen">
      <AppHeader
        title="Importar"
        onBack={
          phase.kind === 'preview' || phase.kind === 'error'
            ? vm.reset
            : navigation.goBack
        }
        backIcon={phase.kind === 'preview' ? 'arrow-back' : 'close'}
      />

      {phase.kind === 'input' && (
        <ScrollView
          contentContainerStyle={styles.inputContent}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="body" color="textSecondary">
            Cole o link de um item do Internet Archive, um link direto para um arquivo de
            áudio ou um vídeo do YouTube (salvo apenas como link).
          </AppText>
          <ImportUrlForm onSubmit={vm.fetchUrl} />
          <AppText variant="caption" color="textMuted">
            Fontes suportadas: {vm.supportedSources.join(', ')}
          </AppText>
          <AppDivider />
          <AppCard variant="outlined" padded={false}>
            <AppListItem
              title="Arquivos do dispositivo"
              subtitle="MP3, M4A, AAC, OGG, OPUS, FLAC ou WAV"
              leadingIcon="phone-portrait-outline"
              showChevron
              onPress={vm.pickLocalFiles}
              testID="import-local"
            />
          </AppCard>
        </ScrollView>
      )}

      {phase.kind === 'loading' && <AppLoadingIndicator fill label={phase.message} />}

      {phase.kind === 'error' && (
        <AppErrorState message={phase.message} onRetry={phase.retry} />
      )}

      {phase.kind === 'preview' && (
        <>
          <FlatList
            data={vm.items}
            keyExtractor={item => item.sourceId}
            renderItem={renderItem}
            initialNumToRender={15}
            windowSize={9}
            removeClippedSubviews
            ListHeaderComponent={
              <ImportPreview
                preview={phase.preview}
                summary={vm.summary}
                selectableCount={vm.items.filter(isSelectable).length}
                onSelectAll={vm.selectAll}
                onClear={vm.clearSelection}
              />
            }
            ListEmptyComponent={
              <AppText
                variant="body"
                color="textSecondary"
                align="center"
                style={styles.emptyText}
              >
                Nenhum arquivo de áudio suportado foi encontrado neste item.
              </AppText>
            }
          />
          <View
            style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]}
          >
            <AppListItem
              title={targetLabel}
              leadingIcon="albums-outline"
              showChevron
              onPress={() => setTargetSheet(true)}
              style={styles.footerRow}
              testID="import-target"
            />
            {vm.hasDownloadable && (
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <AppText variant="bodyStrong">Baixar para ouvir offline</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {vm.freeBytes !== undefined
                      ? `${formatBytes(vm.freeBytes)} livres no dispositivo`
                      : ' '}
                  </AppText>
                </View>
                <AppSwitch
                  value={vm.downloadNow}
                  onValueChange={vm.setDownloadNow}
                  accessibilityLabel="Baixar para ouvir offline"
                  testID="import-download-switch"
                />
              </View>
            )}
            {vm.insufficientSpace && (
              <View style={styles.warning} accessibilityLiveRegion="polite">
                <AppIcon name="warning" size="sm" color="warning" />
                <AppText variant="caption" color="warning" style={styles.switchText}>
                  Espaço insuficiente para tudo. Os downloads que não couberem vão falhar
                  com aviso.
                </AppText>
              </View>
            )}
            <AppButton
              label={
                vm.summary.count > 0
                  ? `Importar ${pluralize(vm.summary.count, 'item', 'itens')}`
                  : 'Selecione itens para importar'
              }
              onPress={onConfirm}
              disabled={vm.summary.count === 0}
              loading={vm.submitting}
              fullWidth
              testID="import-confirm"
            />
          </View>
          <ImportTargetSheet
            visible={targetSheet}
            value={vm.target}
            suggestedName={phase.preview.source.title}
            onChange={vm.setTarget}
            onClose={() => setTargetSheet(false)}
          />
        </>
      )}
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  inputContent: { padding: theme.spacing.lg, gap: theme.spacing.xl },
  emptyText: { padding: theme.spacing.xl },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  footerRow: { paddingHorizontal: theme.spacing.none },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  switchText: { flex: 1 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
}));
