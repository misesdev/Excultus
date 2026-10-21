import React from 'react';
import { View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { AppIconButton } from './AppIconButton';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  /** "large" renders a prominent title, used on tab root screens. */
  variant?: 'large' | 'compact';
  onBack?: () => void;
  backIcon?: 'arrow-back' | 'chevron-down' | 'close';
  actions?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  variant = 'compact',
  onBack,
  backIcon = 'arrow-back',
  actions,
}: AppHeaderProps) {
  const styles = useStyles();
  const large = variant === 'large';

  return (
    <View style={[styles.root, large && styles.large]}>
      {onBack && (
        <AppIconButton
          icon={backIcon}
          accessibilityLabel="Voltar"
          onPress={onBack}
          testID="header-back"
        />
      )}
      <View style={styles.titles}>
        {title && (
          <AppText
            variant={large ? 'title' : 'subheading'}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </AppText>
        )}
        {subtitle && (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: theme.sizes.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  large: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  titles: { flex: 1, paddingHorizontal: theme.spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
}));
