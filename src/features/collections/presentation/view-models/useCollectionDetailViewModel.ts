import { useCallback, useRef, useState } from 'react';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import type { AudioLibraryItem } from '@features/audios';
import { usePlayAudio } from '@features/library/presentation';
import { feedback } from '@shared/feedback/feedbackStore';
import { useAsyncAction } from '@shared/hooks/useAsyncAction';
import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';
import { useQuery } from '@shared/hooks/useQuery';
import { t } from '@core/i18n';
import { moveItem } from '@core/utils';
import type { CollectionDeletionMode, CollectionSortMode } from '../../index';

/**
 * View-model for the collection detail screen: queries, sorting, in-collection
 * search, custom reordering and commands. Keeps the screen purely visual.
 */
export function useCollectionDetailViewModel(collectionId: string) {
  const { collections, player, downloadCommands } = useDependencies();
  const playAudio = usePlayAudio();
  const [sortOverride, setSortOverride] = useState<CollectionSortMode>();
  const [searchText, setSearchText] = useState('');
  const [reorderIds, setReorderIds] = useState<string[] | null>(null);
  const text = useDebouncedValue(searchText);

  const query = useQuery(
    () => collections.getDetail(collectionId, { sort: sortOverride, text }),
    [collectionId, sortOverride, text],
    ['collections', 'library', 'downloads', 'history'],
  );
  const summary = query.data?.summary;
  const sort = sortOverride ?? summary?.collection.sortMode ?? 'custom';
  const items = query.data?.items ?? [];
  const ids = items.map(item => item.audio.id);
  const name = summary?.collection.name ?? '';
  const queueRef = useRef({ ids, name });
  queueRef.current = { ids, name };

  const changeSort = useAsyncAction(async (mode: CollectionSortMode) => {
    setSortOverride(mode);
    await collections.setSortMode(collectionId, mode);
  });

  const playAll = useAsyncAction(async (shuffle: boolean) => {
    const allIds = await collections.listAudioIds(collectionId, sort);
    if (allIds.length === 0) {
      return;
    }
    const start = shuffle ? Math.floor(Math.random() * allIds.length) : 0;
    await player.playQueue(allIds, start, { contextLabel: name });
    if (shuffle !== player.getState().queue.shuffled) {
      await player.toggleShuffle();
    }
  });

  const downloadAll = useAsyncAction(async () => {
    const allIds = await collections.listAudioIds(collectionId, sort);
    const result = await downloadCommands.downloadAudios(allIds);
    feedback.info(
      result.enqueued > 0
        ? t('collections.downloadsQueued', { count: result.enqueued })
        : t('collections.nothingToDownload'),
    );
  });

  const deleteCollection = useAsyncAction(
    async (mode: CollectionDeletionMode) => {
      await collections.delete(collectionId, mode);
      return true;
    },
    { successMessage: t('collections.deleted') },
  );
  const chooseArtwork = useAsyncAction(() => collections.chooseArtwork(collectionId));
  const removeArtwork = useAsyncAction(() => collections.removeArtwork(collectionId));

  const startReorder = useCallback(async () => {
    setSearchText('');
    setSortOverride('custom');
    setReorderIds(await collections.listAudioIds(collectionId, 'custom'));
  }, [collectionId, collections]);

  const move = useCallback((from: number, to: number) => {
    setReorderIds(previous => (previous ? moveItem(previous, from, to) : previous));
  }, []);

  const saveOrder = useAsyncAction(
    async () => {
      if (reorderIds) {
        await collections.reorder(collectionId, reorderIds);
      }
      setReorderIds(null);
    },
    { successMessage: t('collections.orderSaved') },
  );

  const play = useCallback(
    (item: AudioLibraryItem) =>
      playAudio(item, { queueIds: queueRef.current.ids, label: queueRef.current.name }),
    [playAudio],
  );

  const reorderItems = reorderIds
    ? reorderIds
        .map(id => items.find(item => item.audio.id === id))
        .filter((item): item is AudioLibraryItem => item !== undefined)
    : null;

  return {
    query,
    summary,
    items: reorderItems ?? items,
    ids,
    sort,
    searchText,
    setSearchText,
    isSearching: text.length > 0,
    reordering: reorderIds !== null,
    play,
    changeSort,
    playAll,
    downloadAll,
    deleteCollection,
    chooseArtwork,
    removeArtwork,
    startReorder,
    cancelReorder: () => setReorderIds(null),
    move,
    saveOrder,
  };
}
