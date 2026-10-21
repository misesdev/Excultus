import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AppBottomSheet,
  AppButton,
  AppText,
  AppTextInput,
  makeStyles,
} from '@design-system';
import { formatClock } from '@core/utils';
import { BOOKMARK_NOTE_MAX_LENGTH, BOOKMARK_TITLE_MAX_LENGTH } from '../index';

const schema = z.object({
  title: z.string().trim().max(BOOKMARK_TITLE_MAX_LENGTH, 'Título muito longo'),
  note: z.string().trim().max(BOOKMARK_NOTE_MAX_LENGTH, 'Anotação muito longa'),
});

export type BookmarkFormValues = z.infer<typeof schema>;

export interface BookmarkFormSheetProps {
  visible: boolean;
  positionMs: number;
  initialValues?: Partial<BookmarkFormValues>;
  submitting?: boolean;
  onSubmit: (values: BookmarkFormValues) => void;
  onClose: () => void;
}

export function BookmarkFormSheet({
  visible,
  positionMs,
  initialValues,
  submitting,
  onSubmit,
  onClose,
}: BookmarkFormSheetProps) {
  const styles = useStyles();
  const { control, handleSubmit, reset, formState } = useForm<BookmarkFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', note: '' },
  });

  useEffect(() => {
    if (visible) {
      reset({ title: initialValues?.title ?? '', note: initialValues?.note ?? '' });
    }
  }, [initialValues?.note, initialValues?.title, reset, visible]);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Marcador"
      testID="bookmark-form"
    >
      <View style={styles.body}>
        <AppText variant="caption" color="textSecondary" align="center">
          Posição {formatClock(positionMs)}
        </AppText>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <AppTextInput
              label="Título (opcional)"
              placeholder="Ex.: Conceito importante"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.title?.message}
              maxLength={BOOKMARK_TITLE_MAX_LENGTH}
              testID="bookmark-title"
            />
          )}
        />
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <AppTextInput
              label="Anotação (opcional)"
              placeholder="Escreva o que quiser lembrar"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.note?.message}
              multiline
              maxLength={BOOKMARK_NOTE_MAX_LENGTH}
              testID="bookmark-note"
            />
          )}
        />
        <AppButton
          label="Salvar marcador"
          icon="bookmark"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          fullWidth
          testID="bookmark-save"
        />
      </View>
    </AppBottomSheet>
  );
}

const useStyles = makeStyles(theme => ({
  body: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
}));
