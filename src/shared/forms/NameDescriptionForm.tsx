import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppButton, AppTextInput, makeStyles } from '@design-system';
import {
  nameDescriptionSchema,
  type NameDescriptionValues,
} from './nameDescriptionSchema';

export interface NameDescriptionFormProps {
  initialValues?: Partial<NameDescriptionValues>;
  limits: { name: number; description: number };
  nameLabel: string;
  namePlaceholder: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: NameDescriptionValues) => void;
  testIDPrefix: string;
}

/** Shared form for entities described by a name and an optional description. */
export function NameDescriptionForm({
  initialValues,
  limits,
  nameLabel,
  namePlaceholder,
  submitLabel,
  submitting,
  onSubmit,
  testIDPrefix,
}: NameDescriptionFormProps) {
  const styles = useStyles();
  const { control, handleSubmit, reset, formState } = useForm<NameDescriptionValues>({
    resolver: zodResolver(nameDescriptionSchema(limits)),
    defaultValues: { name: '', description: '' },
    mode: 'onTouched',
  });

  useEffect(() => {
    reset({
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
    });
  }, [initialValues?.description, initialValues?.name, reset]);

  return (
    <View style={styles.root}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <AppTextInput
            label={nameLabel}
            placeholder={namePlaceholder}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.name?.message}
            maxLength={limits.name}
            autoFocus={!initialValues?.name}
            returnKeyType="next"
            testID={`${testIDPrefix}-name`}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <AppTextInput
            label="Descrição (opcional)"
            placeholder="Sobre o que é?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.description?.message}
            helperText={`${field.value.length}/${limits.description}`}
            maxLength={limits.description}
            multiline
            testID={`${testIDPrefix}-description`}
          />
        )}
      />
      <AppButton
        label={submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        fullWidth
        testID={`${testIDPrefix}-submit`}
      />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { gap: theme.spacing.lg, padding: theme.spacing.lg },
}));
