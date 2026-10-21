import React from 'react';
import { ScrollView } from 'react-native';
import { AppBottomSheet, AppIcon, AppListItem } from '@design-system';

export interface Option<T> {
  value: T;
  label: string;
  description?: string;
}

export interface OptionSheetProps<T> {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** Single-choice picker presented as a bottom sheet. */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  return (
    <AppBottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView>
        {options.map(option => (
          <AppListItem
            key={String(option.value)}
            testID={`option-${option.value}`}
            title={option.label}
            subtitle={option.description}
            selected={option.value === selected}
            trailing={
              option.value === selected ? (
                <AppIcon name="checkmark" size="md" color="primary" />
              ) : null
            }
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
          />
        ))}
      </ScrollView>
    </AppBottomSheet>
  );
}
