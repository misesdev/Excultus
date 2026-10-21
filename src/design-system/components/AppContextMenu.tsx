import React from 'react';
import { ScrollView } from 'react-native';
import type { IconName } from '../icons/AppIcon';
import { AppBottomSheet } from './AppBottomSheet';
import { AppListItem } from './AppListItem';

export interface AppMenuAction {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface AppContextMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  header?: React.ReactNode;
  actions: AppMenuAction[];
  testID?: string;
}

/** Action menu presented as a bottom sheet (thumb-friendly on mobile). */
export function AppContextMenu({
  visible,
  onClose,
  title,
  header,
  actions,
  testID,
}: AppContextMenuProps) {
  return (
    <AppBottomSheet visible={visible} onClose={onClose} title={title} testID={testID}>
      {header}
      <ScrollView>
        {actions.map(action => (
          <AppListItem
            key={action.key}
            testID={`menu-action-${action.key}`}
            title={action.label}
            leadingIcon={action.icon}
            destructive={action.destructive}
            disabled={action.disabled}
            onPress={() => {
              onClose();
              action.onPress();
            }}
          />
        ))}
      </ScrollView>
    </AppBottomSheet>
  );
}
