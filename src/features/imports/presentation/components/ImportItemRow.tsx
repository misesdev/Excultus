import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppCheckbox, AppText, makeStyles } from '@design-system';
import { formatBytes, formatHumanDuration } from '@core/utils';
import { isSelectable, type SourceAudioItem } from '../../index';

export interface ImportItemRowProps {
  item: SourceAudioItem;
  selected: boolean;
  onToggle: (item: SourceAudioItem) => void;
}

function ImportItemRowComponent({ item, selected, onToggle }: ImportItemRowProps) {
  const styles = useStyles();
  const selectable = isSelectable(item);
  const meta = [
    item.trackNumber ? `#${item.trackNumber}` : null,
    item.durationMs ? formatHumanDuration(item.durationMs) : null,
    item.sizeBytes ? formatBytes(item.sizeBytes) : null,
    item.fileExtension?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      testID={`import-item-${item.sourceId}`}
      onPress={() => onToggle(item)}
      disabled={!selectable}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !selectable }}
      accessibilityLabel={`${item.title}${meta ? `, ${meta}` : ''}`}
      style={({ pressed }) => [
        styles.root,
        pressed && styles.pressed,
        !selectable && styles.disabled,
      ]}
    >
      <AppCheckbox
        checked={selected}
        disabled={!selectable}
        accessibilityLabel={item.title}
      />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {item.title}
        </AppText>
        {meta.length > 0 && (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </AppText>
        )}
      </View>
      {item.availability === 'restricted' && (
        <AppBadge label="Restrito" tone="warning" icon="lock-closed" />
      )}
      {item.availability === 'external' && (
        <AppBadge label="Só link" tone="neutral" icon="link" />
      )}
    </Pressable>
  );
}

export const ImportItemRow = memo(ImportItemRowComponent);

const useStyles = makeStyles(theme => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: theme.sizes.listItemMinHeight,
  },
  pressed: { backgroundColor: theme.colors.surface },
  disabled: { opacity: theme.opacity.disabled },
  texts: { flex: 1, gap: theme.spacing.xxs },
}));
