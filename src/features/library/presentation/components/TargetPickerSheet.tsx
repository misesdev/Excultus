import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppBottomSheet,
  AppButton,
  AppIcon,
  AppListItem,
  AppLoadingIndicator,
  AppTextInput,
  makeStyles,
} from '@design-system';
import { COLLECTION_NAME_MAX_LENGTH } from '@features/collections';
import { pluralize } from '@core/utils';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';

export type TargetKind = 'collection' | 'playlist';

export interface TargetPickerSheetProps {
  kind: TargetKind | null;
  audioId: string | null;
  onClose: () => void;
}

interface Target {
  id: string;
  name: string;
  count: number;
}

/** Toggles membership of an audio in collections or playlists (a track can be in many). */
export function TargetPickerSheet({ kind, audioId, onClose }: TargetPickerSheetProps) {
  const styles = useStyles();
  const { collections, playlists } = useDependencies();
  const [newName, setNewName] = useState('');
  const visible = kind !== null && audioId !== null;

  const { data, loading } = useQuery(
    async (): Promise<{ targets: Target[]; memberOf: string[] }> => {
      if (!kind || !audioId) {
        return { targets: [], memberOf: [] };
      }
      if (kind === 'collection') {
        const [list, memberOf] = await Promise.all([
          collections.list(),
          collections.findCollectionIdsForAudio(audioId),
        ]);
        return {
          targets: list.map(s => ({
            id: s.collection.id,
            name: s.collection.name,
            count: s.audioCount,
          })),
          memberOf,
        };
      }
      const [list, memberOf] = await Promise.all([
        playlists.list(),
        playlists.findPlaylistIdsForAudio(audioId),
      ]);
      return {
        targets: list.map(s => ({
          id: s.playlist.id,
          name: s.playlist.name,
          count: s.audioCount,
        })),
        memberOf,
      };
    },
    [kind, audioId],
    ['collections', 'playlists'],
  );

  const toggle = useAsyncAction(async (target: Target, isMember: boolean) => {
    if (!audioId) {
      return;
    }
    if (kind === 'collection') {
      await (isMember
        ? collections.removeAudio(target.id, audioId)
        : collections.addAudios(target.id, [audioId]));
    } else {
      await (isMember
        ? playlists.removeAudio(target.id, audioId)
        : playlists.addAudios(target.id, [audioId]));
    }
  });

  const create = useAsyncAction(
    async (name: string) => {
      if (!audioId) {
        return;
      }
      if (kind === 'collection') {
        const collection = await collections.create({ name });
        await collections.addAudios(collection.id, [audioId]);
      } else {
        const playlist = await playlists.create({ name });
        await playlists.addAudios(playlist.id, [audioId]);
      }
      setNewName('');
    },
    { successMessage: 'Adicionado' },
  );

  const title = kind === 'collection' ? 'Adicionar à coleção' : 'Adicionar à playlist';
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID="target-picker"
    >
      <View style={styles.create}>
        <View style={styles.input}>
          <AppTextInput
            placeholder={kind === 'collection' ? 'Nova coleção' : 'Nova playlist'}
            value={newName}
            onChangeText={setNewName}
            maxLength={COLLECTION_NAME_MAX_LENGTH}
            returnKeyType="done"
            testID="target-new-name"
          />
        </View>
        <AppButton
          label="Criar"
          size="sm"
          onPress={() => create.run(newName)}
          disabled={newName.trim().length === 0}
          loading={create.running}
        />
      </View>
      {loading && !data ? (
        <AppLoadingIndicator />
      ) : (
        <ScrollView>
          {(data?.targets ?? []).map(target => {
            const isMember = data?.memberOf.includes(target.id) ?? false;
            return (
              <AppListItem
                key={target.id}
                testID={`target-${target.id}`}
                title={target.name}
                subtitle={pluralize(target.count, 'áudio', 'áudios')}
                leadingIcon={kind === 'collection' ? 'albums-outline' : 'list-outline'}
                selected={isMember}
                trailing={
                  isMember ? <AppIcon name="checkmark-circle" color="primary" /> : null
                }
                onPress={() => toggle.run(target, isMember)}
              />
            );
          })}
        </ScrollView>
      )}
    </AppBottomSheet>
  );
}

const useStyles = makeStyles(theme => ({
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  input: { flex: 1 },
}));
