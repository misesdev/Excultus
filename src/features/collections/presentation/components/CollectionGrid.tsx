import React from 'react';
import { FlatList, useWindowDimensions, type ListRenderItem } from 'react-native';
import { makeStyles, useTheme } from '@design-system';
import { listStyles } from '@shared/styles/listStyles';
import type { CollectionSummary } from '../../index';
import { CollectionCard } from './CollectionCard';

const MIN_CARD_WIDTH = 150;

export interface CollectionGridProps {
  summaries: CollectionSummary[];
  onOpen: (collectionId: string) => void;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
}

/** Responsive grid: as many columns as fit, never narrower than MIN_CARD_WIDTH. */
export function CollectionGrid({
  summaries,
  onOpen,
  header,
  empty,
  refreshing,
  onRefresh,
  bottomInset = 0,
}: CollectionGridProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const gutter = theme.spacing.lg;
  const columns = Math.max(2, Math.floor((width - gutter) / (MIN_CARD_WIDTH + gutter)));
  const cardWidth = Math.floor((width - gutter * (columns + 1)) / columns);

  const renderItem: ListRenderItem<CollectionSummary> = ({ item }) => (
    <CollectionCard
      summary={item}
      width={cardWidth}
      onPress={() => onOpen(item.collection.id)}
    />
  );

  return (
    <FlatList
      key={`grid-${columns}`}
      data={summaries}
      numColumns={columns}
      keyExtractor={item => item.collection.id}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        listStyles.grow,
        styles.content,
        { paddingBottom: bottomInset + theme.spacing.xl },
      ]}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

const useStyles = makeStyles(theme => ({
  row: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  content: { gap: theme.spacing.xl },
}));
