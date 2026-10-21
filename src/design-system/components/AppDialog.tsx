import React, { type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { AppButton, type AppButtonVariant } from './AppButton';
import { AppModal } from './AppModal';

export interface AppDialogAction {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  loading?: boolean;
  testID?: string;
}

export interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: AppDialogAction[];
  onDismiss: () => void;
  testID?: string;
}

export function AppDialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
  testID,
  children,
}: PropsWithChildren<AppDialogProps>) {
  const styles = useStyles();
  return (
    <AppModal visible={visible} onRequestClose={onDismiss} testID={testID}>
      <View style={styles.body}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {message && (
          <AppText variant="body" color="textSecondary">
            {message}
          </AppText>
        )}
        {children}
      </View>
      <View style={styles.actions}>
        {actions.map(action => (
          <AppButton
            key={action.label}
            label={action.label}
            onPress={action.onPress}
            variant={action.variant ?? 'ghost'}
            loading={action.loading}
            testID={action.testID}
            fullWidth
          />
        ))}
      </View>
    </AppModal>
  );
}

const useStyles = makeStyles(theme => ({
  body: { gap: theme.spacing.md },
  actions: { marginTop: theme.spacing.xl, gap: theme.spacing.sm },
}));
