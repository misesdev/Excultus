import React, { useState } from 'react';
import { View } from 'react-native';
import {
  AppArtwork,
  AppBadge,
  AppButton,
  AppText,
  makeStyles,
  useTranslation,
} from '@design-system';
import { formatBytes } from '@core/utils';
import type { ImportPreview as ImportPreviewModel, SelectionSummary } from '../../index';

export interface ImportPreviewProps {
  preview: ImportPreviewModel;
  summary: SelectionSummary;
  selectableCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Header of the preview list: source metadata and selection toolbar. */
export function ImportPreview({
  preview,
  summary,
  selectableCount,
  onSelectAll,
  onClear,
}: ImportPreviewProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const { source, items, rejected } = preview;
  const allSelected = summary.count === selectableCount && selectableCount > 0;

  return (
    <View style={styles.root} testID="import-preview">
      <View style={styles.sourceRow}>
        <AppArtwork
          source={source.artworkUrl}
          seed={source.sourceId}
          size="lg"
          radius="lg"
          placeholderIcon="library"
        />
        <View style={styles.sourceTexts}>
          <AppBadge label={preview.providerLabel} tone="primary" />
          <AppText variant="heading" numberOfLines={3} testID="import-source-title">
            {source.title}
          </AppText>
          {source.creator && (
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {source.creator}
            </AppText>
          )}
          <AppText variant="caption" color="textMuted">
            {t('imports.preview.audioFiles', { count: items.length })}
          </AppText>
        </View>
      </View>
      {source.description && (
        <AppText
          variant="caption"
          color="textSecondary"
          numberOfLines={expanded ? undefined : 3}
          onPress={() => setExpanded(value => !value)}
          accessibilityHint={t('imports.preview.expandHint')}
        >
          {source.description}
        </AppText>
      )}
      {source.license && (
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {t('imports.preview.license', { license: source.license })}
        </AppText>
      )}
      {rejected.length > 0 && (
        <AppText variant="caption" color="warning">
          {t('imports.preview.rejected', {
            count: rejected.length,
            files: rejected.join(', '),
          })}
        </AppText>
      )}
      <View style={styles.toolbar}>
        <View style={styles.toolbarText}>
          <AppText variant="captionStrong" testID="import-selection-count">
            {t('imports.preview.selectedCount', {
              count: summary.count,
              total: selectableCount,
            })}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {formatBytes(summary.totalBytes)}
            {summary.unknownSizeCount > 0
              ? ` + ${t('imports.preview.unknownSize', {
                  count: summary.unknownSizeCount,
                })}`
              : ''}
          </AppText>
        </View>
        <AppButton
          label={
            allSelected ? t('imports.preview.clear') : t('imports.preview.selectAll')
          }
          size="sm"
          variant="ghost"
          onPress={allSelected ? onClear : onSelectAll}
          testID="import-toggle-all"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sourceRow: { flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' },
  sourceTexts: { flex: 1, gap: theme.spacing.xs },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  toolbarText: { flex: 1, gap: theme.spacing.xxs },
}));
