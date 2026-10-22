import React from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AppButton,
  AppText,
  AppTextInput,
  makeStyles,
  useTranslation,
} from '@design-system';
import type { TranslationKey } from '@core/i18n';
import { parseHttpsUrl } from '@core/utils';

const urlSchema = (translate: (key: TranslationKey) => string) =>
  z.object({
    url: z
      .string()
      .trim()
      .min(1, translate('imports.url.required'))
      .refine(value => parseHttpsUrl(value) !== null, translate('imports.url.invalid')),
  });

type FormValues = z.infer<ReturnType<typeof urlSchema>>;

export const EXAMPLE_URL = 'https://archive.org/details/COFemAudio';

export function ImportUrlForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { control, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(urlSchema(t)),
    defaultValues: { url: '' },
  });
  const submit = handleSubmit(values => onSubmit(values.url));

  return (
    <View style={styles.root}>
      <Controller
        control={control}
        name="url"
        render={({ field }) => (
          <AppTextInput
            label={t('imports.url.label')}
            placeholder="https://archive.org/details/…"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.url?.message}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="search"
            onSubmitEditing={() => submit()}
            leadingIcon="link"
            testID="import-url-input"
          />
        )}
      />
      <AppButton
        label={t('imports.url.submit')}
        icon="search"
        onPress={submit}
        fullWidth
        testID="import-url-submit"
      />
      <AppText
        variant="caption"
        color="primary"
        onPress={() => setValue('url', EXAMPLE_URL, { shouldValidate: true })}
        accessibilityRole="button"
        testID="import-example"
      >
        {t('imports.url.example', { url: 'archive.org/details/COFemAudio' })}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { gap: theme.spacing.md },
}));
