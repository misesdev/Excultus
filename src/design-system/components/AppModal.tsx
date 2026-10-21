import React, { type PropsWithChildren } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';

export interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Allows closing by tapping outside the content. */
  dismissible?: boolean;
  testID?: string;
}

/** Centered modal surface; Android back button triggers `onRequestClose`. */
export function AppModal({
  visible,
  onRequestClose,
  dismissible = true,
  testID,
  children,
}: PropsWithChildren<AppModalProps>) {
  const styles = useStyles();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop} testID={testID}>
        <Pressable
          style={styles.dismissArea}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          disabled={!dismissible}
          onPress={onRequestClose}
        />
        <View style={styles.content} accessibilityViewIsModal>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(theme => ({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.scrim,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  dismissArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: theme.sizes.maxContentWidth,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.high,
  },
}));
