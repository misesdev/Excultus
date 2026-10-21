import React from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppButton, AppText, AppTextInput, makeStyles } from '@design-system';
import { parseHttpsUrl } from '@core/utils';

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Cole um link')
    .refine(
      value => parseHttpsUrl(value) !== null,
      'Use um link completo começando com https://',
    ),
});

type FormValues = z.infer<typeof schema>;

export const EXAMPLE_URL = 'https://archive.org/details/COFemAudio';

export function ImportUrlForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const styles = useStyles();
  const { control, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
            label="Link do conteúdo"
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
        label="Buscar conteúdo"
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
        Usar exemplo: archive.org/details/COFemAudio
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: { gap: theme.spacing.md },
}));
