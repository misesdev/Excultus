import React from 'react';
import { ScrollView } from 'react-native';
import { AppChip, makeStyles } from '@design-system';
import {
  LIBRARY_FILTERS,
  LIBRARY_SORTS,
  type LibraryFilter,
  type LibrarySort,
} from '@features/search';

export const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'Todos',
  downloaded: 'Baixados',
  'not-downloaded': 'Não baixados',
  favorites: 'Favoritos',
  'in-progress': 'Em andamento',
  completed: 'Concluídos',
};

export const SORT_OPTIONS = LIBRARY_SORTS.map(sort => ({
  value: sort,
  label: {
    title: 'Nome',
    addedAt: 'Data de adição',
    lastPlayed: 'Última reprodução',
    duration: 'Duração',
  }[sort],
}));

export function sortLabel(sort: LibrarySort): string {
  return SORT_OPTIONS.find(option => option.value === sort)?.label ?? '';
}

export function LibraryFilters({
  value,
  onChange,
}: {
  value: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
}) {
  const styles = useStyles();
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
          label={FILTER_LABELS[filter]}
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
