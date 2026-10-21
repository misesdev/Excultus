import type { ImportPreview, ImportTarget, SourceAudioItem } from '@features/imports';
import { settle, type TestApp } from './testContainer';

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

/**
 * Imports YouTube videos through the real provider (fake extractor) without
 * downloading them. Returns audio ids in the order given.
 */
export async function importYouTubeVideos(
  app: TestApp,
  videoIds: string[],
  target: ImportTarget = { kind: 'none' },
): Promise<string[]> {
  const audioIds: string[] = [];
  for (const videoId of videoIds) {
    app.youtube.addVideo(videoId);
    const preview = await app.container.imports.previewFromUrl(
      `https://www.youtube.com/watch?v=${videoId}`,
    );
    const result = await app.container.imports.confirm({
      preview,
      selectedSourceIds: preview.items.map(item => item.sourceId),
      target,
      downloadNow: false,
    });
    audioIds.push(...result.audioIds);
  }
  return audioIds;
}

/** Downloads one audio to completion with the fake downloader. */
export async function downloadAudio(app: TestApp, audioId: string, content = '12345') {
  await app.container.downloadCommands.downloadAudios([audioId]);
  await settle();
  const download = app.downloader.started.find(
    task => !app.downloader.completedTasks.has(task.taskId),
  );
  if (!download) {
    throw new Error(`download for ${audioId} was not started`);
  }
  app.downloader.complete(download.taskId, content);
  await settle();
}
