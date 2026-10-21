import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export interface AppScreenProps {
  /** Wraps content in a ScrollView. Use false for screens with virtualized lists. */
  scrollable?: boolean;
  /** Applies top safe-area inset (disable when a header already handles it). */
  safeTop?: boolean;
  /** Extra bottom space, e.g. to clear the mini player. */
  bottomInset?: number;
  padded?: boolean;
  keyboardAware?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}

export function AppScreen({
  children,
  scrollable = false,
  safeTop = true,
  bottomInset = 0,
  padded = false,
  keyboardAware = false,
  contentStyle,
  testID,
}: PropsWithChildren<AppScreenProps>) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useStyles();
  const paddingStyle: ViewStyle = {
    paddingTop: safeTop ? insets.top : 0,
    paddingHorizontal: padded ? theme.spacing.lg : 0,
  };

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        paddingStyle,
        { paddingBottom: bottomInset + theme.spacing.xl },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[styles.flex, paddingStyle, { paddingBottom: bottomInset }, contentStyle]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root} testID={testID}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
}));
