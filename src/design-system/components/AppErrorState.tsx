import React from 'react';
import { AppEmptyState } from './AppEmptyState';
import { useTranslation } from '../hooks/useTranslation';

export interface AppErrorStateProps {
  /** Friendly message (already mapped from the technical error). */
  message: string;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function AppErrorState({ message, title, onRetry, compact }: AppErrorStateProps) {
  const { t } = useTranslation();
  return (
    <AppEmptyState
      testID="error-state"
      icon="cloud-offline-outline"
      title={title ?? t('common.somethingWentWrong')}
      description={message}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}
