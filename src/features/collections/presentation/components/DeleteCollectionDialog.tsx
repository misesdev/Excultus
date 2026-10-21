import React, { useState } from 'react';
import { View } from 'react-native';
import { AppDialog, AppIcon, AppListItem, makeStyles } from '@design-system';
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
  title: string;
  description: string;
}> = [
  {
    mode: 'keep-files',
    title: 'Manter arquivos baixados',
    description: 'Os áudios continuam na biblioteca e disponíveis offline.',
  },
  {
    mode: 'delete-exclusive-downloads',
    title: 'Liberar espaço',
    description:
      'Apaga downloads usados só por esta coleção. Arquivos compartilhados são mantidos.',
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
  const styles = useStyles();
  const [mode, setMode] = useState<CollectionDeletionMode>('keep-files');
  return (
    <AppDialog
      visible={visible}
      title={`Excluir "${name}"?`}
      message="Os áudios não serão apagados da biblioteca."
      onDismiss={onDismiss}
      testID="delete-collection-dialog"
      actions={[
        {
          label: 'Excluir coleção',
          variant: 'destructive',
          loading: deleting,
          onPress: () => onConfirm(mode),
          testID: 'confirm-delete-collection',
        },
        { label: 'Cancelar', onPress: onDismiss },
      ]}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        {OPTIONS.map(option => (
          <AppListItem
            key={option.mode}
            title={option.title}
            subtitle={option.description}
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
