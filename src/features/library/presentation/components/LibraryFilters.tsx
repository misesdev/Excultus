import React from 'react';
import { ScrollView } from 'react-native';
import { t, type TranslationKey } from '@core/i18n';
import { AppChip, makeStyles, useTranslation } from '@design-system';
import {
  LIBRARY_FILTERS,
  LIBRARY_SORTS,
  type LibraryFilter,
  type LibrarySort,
} from '@features/search';

const FILTER_KEYS: Record<LibraryFilter, TranslationKey> = {
  all: 'library.filters.all',
  downloaded: 'library.filters.downloaded',
  'not-downloaded': 'library.filters.notDownloaded',
  favorites: 'library.filters.favorites',
  'in-progress': 'library.filters.inProgress',
  completed: 'library.filters.completed',
};

const SORT_KEYS: Record<LibrarySort, TranslationKey> = {
  title: 'library.sorts.title',
  addedAt: 'library.sorts.addedAt',
  lastPlayed: 'library.sorts.lastPlayed',
  duration: 'library.sorts.duration',
};

export function filterLabel(filter: LibraryFilter): string {
  return t(FILTER_KEYS[filter]);
}

export function sortLabel(sort: LibrarySort): string {
  return t(SORT_KEYS[sort]);
}

export function sortOptions() {
  return LIBRARY_SORTS.map(sort => ({ value: sort, label: sortLabel(sort) }));
}

export function LibraryFilters({
  value,
  onChange,
}: {
  value: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
}) {
  const styles = useStyles();
  useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {LIBRARY_FILTERS.map(filter => (
        <AppChip
          key={filter}
          label={filterLabel(filter)}
          selected={value === filter}
          onPress={() => onChange(filter)}
          testID={`filter-${filter}`}
        />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(theme => ({
  row: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
}));
