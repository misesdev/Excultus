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
  useTranslation,
} from '@design-system';
import { getUserMessage } from '@core/errors';
import { formatBytes } from '@core/utils';
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
  const { t } = useTranslation();
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
      return t('imports.target.new', { name: vm.target.name });
    }
    if (vm.target.kind === 'existing') {
      const targetId = vm.target.collectionId;
      const found = collectionsQuery.data?.find(
        summary => summary.collection.id === targetId,
      );
      return found
        ? t('imports.target.existing', { name: found.collection.name })
        : t('imports.target.existingUnknown');
    }
    return t('imports.target.none');
  })();

  const onConfirm = async () => {
    try {
      const result = await vm.confirm();
      if (!result) {
        return;
      }
      feedback.success(
        t('imports.imported', { count: result.audioIds.length }) +
          (result.enqueuedDownloads > 0
            ? ` · ${t('imports.queuedDownloads', { count: result.enqueuedDownloads })}`
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
        title={t('imports.title')}
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
            {t('imports.intro')}
          </AppText>
          <ImportUrlForm onSubmit={vm.fetchUrl} />
          <AppText variant="caption" color="textMuted">
            {t('imports.supportedSources', { sources: vm.supportedSources.join(', ') })}
          </AppText>
          <AppDivider />
          <AppCard variant="outlined" padded={false}>
            <AppListItem
              title={t('imports.sources.deviceFiles')}
              subtitle={t('imports.deviceFormats')}
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
                {t('imports.noSupportedFiles')}
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
                  <AppText variant="bodyStrong">{t('audioActions.download')}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {vm.freeBytes !== undefined
                      ? t('imports.freeSpace', { size: formatBytes(vm.freeBytes) })
                      : ' '}
                  </AppText>
                </View>
                <AppSwitch
                  value={vm.downloadNow}
                  onValueChange={vm.setDownloadNow}
                  accessibilityLabel={t('audioActions.download')}
                  testID="import-download-switch"
                />
              </View>
            )}
            {vm.insufficientSpace && (
              <View style={styles.warning} accessibilityLiveRegion="polite">
                <AppIcon name="warning" size="sm" color="warning" />
                <AppText variant="caption" color="warning" style={styles.switchText}>
                  {t('imports.insufficientSpace')}
                </AppText>
              </View>
            )}
            <AppButton
              label={
                vm.summary.count > 0
                  ? t('imports.importCount', { count: vm.summary.count })
                  : t('imports.selectItems')
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
