import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppBottomSheet,
  AppButton,
  AppIcon,
  AppListItem,
  AppTextInput,
  makeStyles,
  useTranslation,
} from '@design-system';
import { COLLECTION_NAME_MAX_LENGTH } from '@features/collections';
import { useQuery } from '@shared/hooks/useQuery';
import type { ImportTarget } from '../../index';

export interface ImportTargetSheetProps {
  visible: boolean;
  value: ImportTarget;
  suggestedName: string;
  onChange: (target: ImportTarget) => void;
  onClose: () => void;
}

/** Chooses where imported audios go: a new collection, an existing one, or none. */
export function ImportTargetSheet({
  visible,
  value,
  suggestedName,
  onChange,
  onClose,
}: ImportTargetSheetProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { collections } = useDependencies();
  const [name, setName] = useState(value.kind === 'new' ? value.name : suggestedName);
  const { data } = useQuery(() => collections.list(), [], ['collections']);

  useEffect(() => {
    if (visible) {
      setName(value.kind === 'new' ? value.name : suggestedName);
    }
  }, [suggestedName, value, visible]);

  const select = (target: ImportTarget) => {
    onChange(target);
    onClose();
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('imports.target.title')}
      testID="import-target-sheet"
    >
      <View style={styles.newCollection}>
        <View style={styles.input}>
          <AppTextInput
            label={t('targetPicker.newCollection')}
            value={name}
            onChangeText={setName}
            maxLength={COLLECTION_NAME_MAX_LENGTH}
            testID="import-new-collection-name"
          />
        </View>
        <AppButton
          label={t('imports.target.use')}
          size="sm"
          disabled={name.trim().length === 0}
          onPress={() => select({ kind: 'new', name: name.trim() })}
        />
      </View>
      <ScrollView>
        {(data ?? []).map(summary => {
          const selected =
            value.kind === 'existing' && value.collectionId === summary.collection.id;
          return (
            <AppListItem
              key={summary.collection.id}
              title={summary.collection.name}
              subtitle={t('common.audioCount', { count: summary.audioCount })}
              leadingIcon="albums-outline"
              selected={selected}
              trailing={selected ? <AppIcon name="checkmark" color="primary" /> : null}
              onPress={() =>
                select({ kind: 'existing', collectionId: summary.collection.id })
              }
            />
          );
        })}
        <AppListItem
          title={t('imports.target.noneTitle')}
          subtitle={t('imports.target.noneSubtitle')}
          leadingIcon="library-outline"
          selected={value.kind === 'none'}
          onPress={() => select({ kind: 'none' })}
        />
      </ScrollView>
    </AppBottomSheet>
  );
}

const useStyles = makeStyles(theme => ({
  newCollection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  input: { flex: 1 },
}));
