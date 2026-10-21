import { z } from 'zod';

const scalar = z.union([z.string(), z.number()]);

/** Archive.org fields are loosely typed; only what the app reads is declared. */
export const archiveFileSchema = z
  .object({
    name: z.string(),
    source: z.string().optional(),
    format: z.string().optional(),
    original: z.string().optional(),
    size: scalar.optional(),
    length: scalar.optional(),
    md5: z.string().optional(),
    title: z.string().optional(),
    track: scalar.optional(),
    album: z.string().optional(),
    creator: z.string().optional(),
    artist: z.string().optional(),
    private: z.union([z.string(), z.boolean()]).optional(),
  })
  .passthrough();

export const archiveMetadataResponseSchema = z
  .object({
    metadata: z.record(z.string(), z.unknown()).optional(),
    files: z.array(archiveFileSchema).optional(),
    is_dark: z.boolean().optional(),
  })
  .passthrough();

export type ArchiveFile = z.infer<typeof archiveFileSchema>;
export type ArchiveMetadataResponse = z.infer<typeof archiveMetadataResponseSchema>;
