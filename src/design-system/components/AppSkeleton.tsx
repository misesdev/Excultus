import React from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { usePulse } from '../animations/useFadeIn';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { radius as radiusTokens } from '../tokens';

export interface AppSkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: keyof typeof radiusTokens;
}

export function AppSkeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
}: AppSkeletonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const pulse = usePulse(true);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bone, { width, height, borderRadius: theme.radius[radius] }]}
    >
      <Animated.View style={[styles.highlight, { opacity: pulse }]} />
    </View>
  );
}

/** Skeleton shaped like a list row: artwork + two text lines. */
export function AppListSkeleton({ rows = 6 }: { rows?: number }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Carregando"
      accessibilityRole="progressbar"
      testID="list-skeleton"
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <AppSkeleton
            width={theme.sizes.artwork.sm}
            height={theme.sizes.artwork.sm}
            radius="md"
          />
          <View style={styles.lines}>
            <AppSkeleton width="70%" height={14} />
            <AppSkeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  bone: { backgroundColor: theme.colors.skeleton, overflow: 'hidden' },
  highlight: { flex: 1, backgroundColor: theme.colors.skeletonHighlight },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  lines: { flex: 1, gap: theme.spacing.sm },
}));
