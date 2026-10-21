import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppButton,
  AppCheckbox,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppListSkeleton,
  AppLoadingIndicator,
  AppScreen,
  AppSearchInput,
  makeStyles,
  useTheme,
} from '@design-system';
import { pluralize } from '@core/utils';
import { AudioListItem } from '@features/audios/presentation';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';
import { listStyles } from '@shared/styles/listStyles';

/** Picks existing library audios to add to a collection or playlist. */
export function AudioPickerScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const { target } = useAppRoute<typeof Routes.AudioPicker>().params;
  const { search, collections, playlists } = useDependencies();
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const query = useDebouncedValue(text);
  const { items, loading, loadingMore, error, refetch, loadMore } = usePaginatedQuery(
    page => search.search({ text: query, filter: 'all', sort: 'title' }, page),
    [query],
    ['library'],
  );
  const add = useAsyncAction(
    async () => {
      const ids = [...selected];
      const added =
        target.kind === 'collection'
          ? await collections.addAudios(target.id, ids)
          : await playlists.addAudios(target.id, ids);
      navigation.goBack();
      return added;
    },
    { successMessage: `Adicionado a ${target.name}` },
  );

  const toggle = (audioId: string) =>
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(audioId)) {
        next.delete(audioId);
      } else {
        next.add(audioId);
      }
      return next;
    });

  return (
    <AppScreen>
      <AppHeader
        title="Adicionar áudios"
        subtitle={target.name}
        onBack={navigation.goBack}
        backIcon="close"
      />
      <View style={styles.search}>
        <AppSearchInput
          value={text}
          onChangeText={setText}
          placeholder="Buscar na biblioteca"
        />
      </View>
      {loading ? (
        <AppListSkeleton />
      ) : error && items.length === 0 ? (
        <AppErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.audio.id}
          contentContainerStyle={listStyles.grow}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <AppLoadingIndicator size="small" /> : undefined
          }
          ListEmptyComponent={
            <AppEmptyState
              icon="library-outline"
              title={query ? 'Nada encontrado' : 'Biblioteca vazia'}
              description={
                query ? undefined : 'Importe conteúdos para poder adicioná-los aqui.'
              }
            />
          }
          renderItem={({ item }) => {
            const checked = selected.has(item.audio.id);
            return (
              <AudioListItem
                item={item}
                selected={checked}
                onPress={() => toggle(item.audio.id)}
                trailing={
                  <AppCheckbox
                    checked={checked}
                    accessibilityLabel={`Selecionar ${item.audio.title}`}
                    onChange={() => toggle(item.audio.id)}
                  />
                }
              />
            );
          }}
        />
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <AppButton
          label={
            selected.size > 0
              ? `Adicionar ${pluralize(selected.size, 'áudio', 'áudios')}`
              : 'Selecione áudios'
          }
          onPress={() => add.run()}
          disabled={selected.size === 0}
          loading={add.running}
          fullWidth
        />
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  search: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
}));
