import React from 'react';
import { AppEmptyState } from './AppEmptyState';

export interface AppErrorStateProps {
  /** Friendly message (already mapped from the technical error). */
  message: string;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function AppErrorState({
  message,
  title = 'Algo deu errado',
  onRetry,
  compact,
}: AppErrorStateProps) {
  return (
    <AppEmptyState
      testID="error-state"
      icon="cloud-offline-outline"
      title={title}
      description={message}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}
