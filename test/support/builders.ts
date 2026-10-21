import { createAudio, type Audio, type NewAudioInput } from '@features/audios';
import { createCollection, type Collection } from '@features/collections';

const NOW = '2026-01-01T10:00:00.000Z';

export function buildAudio(
  id: string,
  overrides: Partial<NewAudioInput> = {},
  now = NOW,
): Audio {
  return createAudio(
    {
      title: `Aula ${id}`,
      sourceType: 'archive',
      sourceId: `item/${id}.mp3`,
      mediaUrl: `https://archive.org/download/item/${id}.mp3`,
      durationMs: 60000,
      ...overrides,
    },
    id,
    now,
  );
}

export function buildCollection(
  id: string,
  name = `Coleção ${id}`,
  now = NOW,
): Collection {
  return createCollection({ name }, id, now);
}
