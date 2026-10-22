import React, { useState } from 'react';
import type { TranslationKey } from '@core/i18n';
import { FlatList, View } from 'react-native';
import { Routes, useAppNavigation, useAppRoute } from '@app/navigation/routes';
import {
  AppButton,
  AppContextMenu,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppListSkeleton,
  AppScreen,
  AppSearchInput,
  makeStyles,
  type AppMenuAction,
  useTranslation,
} from '@design-system';
import { LibraryAudioRow } from '@features/library/presentation';
import { OptionSheet } from '@shared/components/OptionSheet';
import { listStyles } from '@shared/styles/listStyles';
import type { CollectionSortMode } from '../../index';
import { CollectionHeader } from '../components/CollectionHeader';
import { DeleteCollectionDialog } from '../components/DeleteCollectionDialog';
import { useCollectionDetailViewModel } from '../view-models/useCollectionDetailViewModel';

const SORT_OPTIONS: Array<{ value: CollectionSortMode; label: TranslationKey }> = [
  { value: 'custom', label: 'collections.sorts.custom' },
  { value: 'title', label: 'library.sorts.title' },
  { value: 'addedAt', label: 'library.sorts.addedAt' },
  { value: 'duration', label: 'library.sorts.duration' },
];

export function CollectionDetailScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigation = useAppNavigation();
  const { collectionId } = useAppRoute<typeof Routes.CollectionDetail>().params;
  const vm = useCollectionDetailViewModel(collectionId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { summary, query } = vm;

  if (query.loading && !summary) {
    return (
      <AppScreen>
        <AppHeader onBack={navigation.goBack} />
        <AppListSkeleton />
      </AppScreen>
    );
  }
  if (!summary) {
    return (
      <AppScreen>
        <AppHeader onBack={navigation.goBack} />
        <AppErrorState
          message={query.error ?? t('collections.notFound')}
          onRetry={query.refetch}
        />
      </AppScreen>
    );
  }

  const { collection } = summary;
  const menuActions: AppMenuAction[] = [
    {
      key: 'edit',
      label: t('collections.menu.edit'),
      icon: 'create-outline',
      onPress: () => navigation.navigate(Routes.CollectionForm, { collectionId }),
    },
    {
      key: 'cover',
      label: t('collections.menu.chooseCover'),
      icon: 'image-outline',
      onPress: () => vm.chooseArtwork.run(),
    },
    ...(collection.artworkPath
      ? [
          {
            key: 'remove-cover',
            label: t('collections.menu.removeCover'),
            icon: 'close-circle-outline' as const,
            onPress: () => vm.removeArtwork.run(),
          },
        ]
      : []),
    {
      key: 'add',
      label: t('collections.menu.addFromLibrary'),
      icon: 'add-circle-outline',
      onPress: () =>
        navigation.navigate(Routes.AudioPicker, {
          target: { kind: 'collection', id: collectionId, name: collection.name },
        }),
    },
    {
      key: 'import',
      label: t('collections.menu.importHere'),
      icon: 'cloud-download-outline',
      onPress: () => navigation.navigate(Routes.Import, { collectionId }),
    },
    {
      key: 'reorder',
      label: t('collections.menu.reorder'),
      icon: 'reorder-four-outline',
      disabled: summary.audioCount < 2,
      onPress: () => vm.startReorder(),
    },
    {
      key: 'delete',
      label: t('collections.delete.confirm'),
      icon: 'trash-outline',
      destructive: true,
      onPress: () => setDeleteOpen(true),
    },
  ];

  return (
    <AppScreen testID="collection-detail">
      <AppHeader
        title={
          vm.reordering
            ? t('collections.menu.reorder')
            : searchOpen
            ? undefined
            : collection.name
        }
        onBack={vm.reordering ? vm.cancelReorder : navigation.goBack}
        backIcon={vm.reordering ? 'close' : 'arrow-back'}
        actions={
          vm.reordering ? (
            <AppButton
              label={t('common.save')}
              size="sm"
              onPress={() => vm.saveOrder.run()}
              loading={vm.saveOrder.running}
            />
          ) : (
            <>
              <AppIconButton
                icon={searchOpen ? 'close' : 'search'}
                accessibilityLabel={
                  searchOpen ? t('collections.closeSearch') : t('collections.searchHere')
                }
                onPress={() => {
                  setSearchOpen(open => !open);
                  vm.setSearchText('');
                }}
              />
              <AppIconButton
                icon="swap-vertical"
                accessibilityLabel={t('collections.sort')}
                onPress={() => setSortOpen(true)}
              />
            </>
          )
        }
      />
      {searchOpen && !vm.reordering && (
        <View style={styles.search}>
          <AppSearchInput
            value={vm.searchText}
            onChangeText={vm.setSearchText}
            placeholder={t('collections.searchHere')}
            autoFocus
          />
        </View>
      )}
      <FlatList
        data={vm.items}
        keyExtractor={item => item.audio.id}
        contentContainerStyle={listStyles.grow}
        refreshing={query.refreshing}
        onRefresh={query.refetch}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          searchOpen || vm.reordering ? undefined : (
            <CollectionHeader
              summary={summary}
              onPlay={() => vm.playAll.run(false)}
              onShuffle={() => vm.playAll.run(true)}
              onDownloadAll={() => vm.downloadAll.run()}
              downloading={vm.downloadAll.running}
              onMore={() => setMenuOpen(true)}
            />
          )
        }
        ListEmptyComponent={
          vm.isSearching ? (
            <AppEmptyState
              compact
              icon="search-outline"
              title={t('collections.noResults')}
            />
          ) : (
            <AppEmptyState
              compact
              icon="musical-notes-outline"
              title={t('collections.empty.title')}
              description={t('collections.empty.description')}
              actionLabel={t('collections.menu.importHere')}
              onAction={() => navigation.navigate(Routes.Import, { collectionId })}
              secondaryActionLabel={t('collections.empty.addFromLibrary')}
              onSecondaryAction={() =>
                navigation.navigate(Routes.AudioPicker, {
                  target: { kind: 'collection', id: collectionId, name: collection.name },
                })
              }
            />
          )
        }
        renderItem={({ item, index }) => (
          <LibraryAudioRow
            item={item}
            onPress={vm.play}
            hideActions={vm.reordering}
            testID={`collection-audio-${index}`}
            actionContext={{
              collectionId,
              queueIds: vm.ids,
              queueLabel: collection.name,
            }}
            trailing={
              vm.reordering ? (
                <View style={styles.reorder}>
                  <AppIconButton
                    icon="chevron-up"
                    size="sm"
                    accessibilityLabel={t('collections.moveUp', {
                      title: item.audio.title,
                    })}
                    disabled={index === 0}
                    onPress={() => vm.move(index, index - 1)}
                  />
                  <AppIconButton
                    icon="chevron-down"
                    size="sm"
                    accessibilityLabel={t('collections.moveDown', {
                      title: item.audio.title,
                    })}
                    disabled={index === vm.items.length - 1}
                    onPress={() => vm.move(index, index + 1)}
                  />
                </View>
              ) : undefined
            }
          />
        )}
      />
      <AppContextMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={collection.name}
        actions={menuActions}
      />
      <OptionSheet
        visible={sortOpen}
        title={t('library.sortTitle')}
        options={SORT_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
        selected={vm.sort}
        onSelect={mode => vm.changeSort.run(mode)}
        onClose={() => setSortOpen(false)}
      />
      <DeleteCollectionDialog
        visible={deleteOpen}
        name={collection.name}
        deleting={vm.deleteCollection.running}
        onDismiss={() => setDeleteOpen(false)}
        onConfirm={async mode => {
          const deleted = await vm.deleteCollection.run(mode);
          setDeleteOpen(false);
          if (deleted) {
            navigation.goBack();
          }
        }}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles(theme => ({
  search: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  reorder: { flexDirection: 'row' },
}));
