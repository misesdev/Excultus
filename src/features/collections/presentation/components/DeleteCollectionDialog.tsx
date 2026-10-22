import React, { useState } from 'react';
import { View } from 'react-native';
import type { TranslationKey } from '@core/i18n';
import {
  AppDialog,
  AppIcon,
  AppListItem,
  makeStyles,
  useTranslation,
} from '@design-system';
import type { CollectionDeletionMode } from '../../index';

export interface DeleteCollectionDialogProps {
  visible: boolean;
  name: string;
  deleting: boolean;
  onConfirm: (mode: CollectionDeletionMode) => void;
  onDismiss: () => void;
}

const OPTIONS: Array<{
  mode: CollectionDeletionMode;
  title: TranslationKey;
  description: TranslationKey;
}> = [
  {
    mode: 'keep-files',
    title: 'collections.delete.keepFiles',
    description: 'collections.delete.keepFilesDescription',
  },
  {
    mode: 'delete-exclusive-downloads',
    title: 'collections.delete.freeSpace',
    description: 'collections.delete.freeSpaceDescription',
  },
];

/** Deleting a collection never deletes the audios; the user decides about local files. */
export function DeleteCollectionDialog({
  visible,
  name,
  deleting,
  onConfirm,
  onDismiss,
}: DeleteCollectionDialogProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [mode, setMode] = useState<CollectionDeletionMode>('keep-files');
  return (
    <AppDialog
      visible={visible}
      title={t('collections.delete.title', { name })}
      message={t('collections.delete.message')}
      onDismiss={onDismiss}
      testID="delete-collection-dialog"
      actions={[
        {
          label: t('collections.delete.confirm'),
          variant: 'destructive',
          loading: deleting,
          onPress: () => onConfirm(mode),
          testID: 'confirm-delete-collection',
        },
        { label: t('common.cancel'), onPress: onDismiss },
      ]}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        {OPTIONS.map(option => (
          <AppListItem
            key={option.mode}
            title={t(option.title)}
            subtitle={t(option.description)}
            selected={mode === option.mode}
            onPress={() => setMode(option.mode)}
            style={styles.option}
            leading={
              <AppIcon
                name={mode === option.mode ? 'radio-button-on' : 'radio-button-off'}
                color={mode === option.mode ? 'primary' : 'textMuted'}
              />
            }
          />
        ))}
      </View>
    </AppDialog>
  );
}

const useStyles = makeStyles(theme => ({
  options: { gap: theme.spacing.xs },
  option: { paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.md },
}));
