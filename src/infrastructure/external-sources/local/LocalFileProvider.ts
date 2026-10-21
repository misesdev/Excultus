import type { DocumentPicker, FileStorage } from '@core/application';
import { fileBaseName } from '@core/utils';
import { mimeTypeForExtension, resolveAudioExtension } from '@features/audios';
import type {
  LocalAudioSource,
  SourceAudioItem,
  SourceMetadata,
} from '@features/imports';

const LOCAL_METADATA: SourceMetadata = {
  sourceType: 'local',
  sourceId: 'device',
  title: 'Arquivos do dispositivo',
  originalUrl: '',
};

/**
 * Imports audio files chosen by the user through the system picker. Files
 * are validated by extension *and* MIME type; rejected copies are deleted
 * right away. The source id (name + size) deduplicates repeated imports.
 */
export class LocalFileProvider implements LocalAudioSource {
  constructor(
    private readonly picker: DocumentPicker,
    private readonly storage: FileStorage,
  ) {}

  async pickAudioFiles(): Promise<{
    metadata: SourceMetadata;
    items: SourceAudioItem[];
    rejected: string[];
  }> {
    const picked = await this.picker.pickAudioFiles();
    const items: SourceAudioItem[] = [];
    const rejected: string[] = [];
    for (const file of picked) {
      const extension = resolveAudioExtension({
        fileName: file.name,
        mimeType: file.mimeType,
      });
      const sizeBytes =
        file.sizeBytes ?? (await this.storage.fileSize(file.localPath)) ?? undefined;
      if (!extension) {
        rejected.push(file.name);
        await this.storage.remove(file.localPath);
        continue;
      }
      items.push({
        sourceId: `${file.name}:${sizeBytes ?? 'unknown'}`,
        title: fileBaseName(file.name).replace(/[_]+/g, ' '),
        sizeBytes,
        mimeType: mimeTypeForExtension(extension),
        fileExtension: extension,
        fileName: file.name,
        availability: 'available',
        acquisition: { kind: 'copy', localPath: file.localPath, sourceUri: file.name },
      });
    }
    return { metadata: LOCAL_METADATA, items, rejected };
  }
}
