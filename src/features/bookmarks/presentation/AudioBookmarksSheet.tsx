import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import {
  AppBottomSheet,
  AppButton,
  AppEmptyState,
  AppIconButton,
  AppListItem,
  makeStyles,
} from '@design-system';
import { formatClock } from '@core/utils';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useQuery } from '@shared/hooks/useQuery';
import { BookmarkFormSheet, type BookmarkFormValues } from './BookmarkFormSheet';

export interface AudioBookmarksSheetProps {
  visible: boolean;
  audioId: string;
  /** Current playback position used when adding a bookmark. */
  getPositionMs: () => number;
  onSeek: (positionMs: number) => void;
  onClose: () => void;
}

/** Bookmarks of the playing audio: jump to one or add a new one. */
export function AudioBookmarksSheet({
  visible,
  audioId,
  getPositionMs,
  onSeek,
  onClose,
}: AudioBookmarksSheetProps) {
  const styles = useStyles();
  const { bookmarks } = useDependencies();
  const [formPosition, setFormPosition] = useState<number | null>(null);
  const { data } = useQuery(
    () => bookmarks.listForAudio(audioId),
    [audioId],
    ['bookmarks'],
  );
  const add = useAsyncAction(
    (values: BookmarkFormValues, positionMs: number) =>
      bookmarks.add({ audioId, positionMs, title: values.title, note: values.note }),
    { successMessage: 'Marcador salvo' },
  );

  return (
    <>
      <AppBottomSheet
        visible={visible && formPosition === null}
        onClose={onClose}
        title="Marcadores"
      >
        <View style={styles.actions}>
          <AppButton
            label="Marcar posição atual"
            icon="bookmark-outline"
            variant="secondary"
            onPress={() => setFormPosition(getPositionMs())}
            fullWidth
            testID="bookmark-add"
          />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={bookmark => bookmark.id}
          ListEmptyComponent={
            <AppEmptyState
              compact
              icon="bookmark-outline"
              title="Nenhum marcador"
              description="Salve pontos importantes para voltar a eles depois."
            />
          }
          renderItem={({ item: bookmark }) => (
            <AppListItem
              title={bookmark.title ?? `Marcador em ${formatClock(bookmark.positionMs)}`}
              subtitle={formatClock(bookmark.positionMs)}
              caption={bookmark.note}
              leadingIcon="bookmark"
              onPress={() => {
                onSeek(bookmark.positionMs);
                onClose();
              }}
              trailing={
                <AppIconButton
                  icon="trash-outline"
                  size="sm"
                  color="textSecondary"
                  accessibilityLabel="Excluir marcador"
                  onPress={() => bookmarks.remove(bookmark.id)}
                />
              }
            />
          )}
        />
      </AppBottomSheet>
      <BookmarkFormSheet
        visible={formPosition !== null}
        positionMs={formPosition ?? 0}
        submitting={add.running}
        onClose={() => setFormPosition(null)}
        onSubmit={async values => {
          if (formPosition !== null && (await add.run(values, formPosition))) {
            setFormPosition(null);
          }
        }}
      />
    </>
  );
}

const useStyles = makeStyles(theme => ({
  actions: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
}));
