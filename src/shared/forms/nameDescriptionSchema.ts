import { z } from 'zod';
import { t } from '@core/i18n';

/**
 * Form schema shared by collection and playlist forms. Domain validation
 * (requireName/optionalText) remains the authority; this mirrors it to give
 * immediate, field-level feedback.
 */
export function nameDescriptionSchema(limits: { name: number; description: number }) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('forms.nameRequired'))
      .max(limits.name, t('forms.maxLength', { max: limits.name })),
    description: z
      .string()
      .trim()
      .max(limits.description, t('forms.maxLength', { max: limits.description })),
  });
}

export type NameDescriptionValues = z.infer<ReturnType<typeof nameDescriptionSchema>>;
