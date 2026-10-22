import React from 'react';
import { AppIconButton } from './AppIconButton';
import { AppTextInput } from './AppTextInput';
import { useTranslation } from '../hooks/useTranslation';

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
  placeholder,
  autoFocus,
  testID,
}: AppSearchInputProps) {
  const { t } = useTranslation();
  return (
    <AppTextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? t('common.search')}
      accessibilityLabel={placeholder ?? t('common.search')}
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
            accessibilityLabel={t('common.clearSearch')}
            onPress={() => onChangeText('')}
          />
        ) : null
      }
    />
  );
}
