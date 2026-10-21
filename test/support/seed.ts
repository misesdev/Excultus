import type { ImportPreview, ImportTarget, SourceAudioItem } from '@features/imports';
import type { TestApp } from './testContainer';

export function archiveItem(
  name: string,
  overrides: Partial<SourceAudioItem> = {},
): SourceAudioItem {
  const url = `https://archive.org/download/item/${name}.mp3`;
  return {
    sourceId: `item/${name}.mp3`,
    title: `Aula ${name}`,
    durationMs: 60000,
    sizeBytes: 5,
    fileExtension: 'mp3',
    mimeType: 'audio/mpeg',
    mediaUrl: url,
    availability: 'available',
    acquisition: { kind: 'download', url },
    ...overrides,
  };
}

export function archivePreview(items: SourceAudioItem[]): ImportPreview {
  return {
    providerLabel: 'Internet Archive',
    source: {
      sourceType: 'archive',
      sourceId: 'item',
      title: 'Curso',
      creator: 'Autor',
      originalUrl: 'https://archive.org/details/item',
    },
    items,
    rejected: [],
  };
}

/** Imports items through the real use case and returns audio ids in order. */
export async function importItems(
  app: TestApp,
  names: string[],
  target: ImportTarget = { kind: 'new', name: 'Curso' },
) {
  const preview = archivePreview(names.map(name => archiveItem(name)));
  return app.container.imports.confirm({
    preview,
    selectedSourceIds: preview.items.map(item => item.sourceId),
    target,
    downloadNow: false,
  });
}
