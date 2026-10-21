import React from 'react';
import { View } from 'react-native';
import {
  AppContextMenu,
  AppDivider,
  makeStyles,
  type AppMenuAction,
} from '@design-system';
import type { AudioLibraryItem } from '../../domain/entities/AudioLibraryItem';
import { AudioArtwork } from './AudioArtwork';
import { AudioMetadata } from './AudioMetadata';

export interface AudioActionsMenuProps {
  item: AudioLibraryItem | null;
  actions: AppMenuAction[];
  onClose: () => void;
}

/** Contextual actions for an audio, headed by its artwork and metadata. */
export function AudioActionsMenu({ item, actions, onClose }: AudioActionsMenuProps) {
  const styles = useStyles();
  return (
    <AppContextMenu
      visible={item !== null}
      onClose={onClose}
      actions={actions}
      testID="audio-actions-menu"
      header={
        item ? (
          <>
            <View style={styles.header}>
              <AudioArtwork audio={item.audio} size="md" />
              <AudioMetadata audio={item.audio} />
            </View>
            <AppDivider />
          </>
        ) : null
      }
    />
  );
}

const useStyles = makeStyles(theme => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
}));
