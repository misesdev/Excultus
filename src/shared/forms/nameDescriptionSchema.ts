import { z } from 'zod';

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
      .min(1, 'Informe um nome')
      .max(limits.name, `Use no máximo ${limits.name} caracteres`),
    description: z
      .string()
      .trim()
      .max(limits.description, `Use no máximo ${limits.description} caracteres`),
  });
}

export type NameDescriptionValues = z.infer<ReturnType<typeof nameDescriptionSchema>>;
