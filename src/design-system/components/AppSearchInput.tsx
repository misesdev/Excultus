import React from 'react';
import { AppIconButton } from './AppIconButton';
import { AppTextInput } from './AppTextInput';

export interface AppSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  testID?: string;
}

export function AppSearchInput({
  value,
  onChangeText,
  placeholder = 'Buscar',
  autoFocus,
  testID,
}: AppSearchInputProps) {
  return (
    <AppTextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      leadingIcon="search"
      autoFocus={autoFocus}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      trailing={
        value.length > 0 ? (
          <AppIconButton
            icon="close-circle"
            size="sm"
            color="textMuted"
            accessibilityLabel="Limpar busca"
            onPress={() => onChangeText('')}
          />
        ) : null
      }
    />
  );
}
