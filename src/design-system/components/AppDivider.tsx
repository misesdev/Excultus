import React from 'react';
import { StyleSheet, View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';

export function AppDivider({ inset = false }: { inset?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.divider, inset && styles.inset]} />;
}

const useStyles = makeStyles(theme => ({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  inset: { marginLeft: theme.spacing.lg },
}));
