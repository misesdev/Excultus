import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  saveDocuments,
  types,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import type { DocumentPicker, Logger, PickedFile } from '@core/application';
import { FileNotFoundError } from '@core/errors';
import { sanitizeFileName } from './RnfsFileStorage';

function isCancellation(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}

function uriToPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

/**
 * Storage Access Framework picker. Picked documents are copied into the app
 * cache (keepLocalCopy) so later steps work with plain app-owned files and
 * no broad storage permission is ever requested.
 */
export class NativeDocumentPicker implements DocumentPicker {
  constructor(private readonly logger: Logger) {}

  async pickAudioFiles(): Promise<PickedFile[]> {
    return this.pickAndCopy({ type: [types.audio], allowMultiSelection: true });
  }

  async pickImage(): Promise<PickedFile | null> {
    return (
      (await this.pickAndCopy({ type: [types.images], allowMultiSelection: false }))[0] ??
      null
    );
  }

  async pickJsonFile(): Promise<PickedFile | null> {
    return (
      (
        await this.pickAndCopy({
          type: [types.json, types.plainText],
          allowMultiSelection: false,
        })
      )[0] ?? null
    );
  }

  async saveFileAs(
    sourcePath: string,
    fileName: string,
    mimeType: string,
  ): Promise<boolean> {
    try {
      const [result] = await saveDocuments({
        sourceUris: [`file://${sourcePath}`],
        fileName,
        mimeType,
        copy: true,
      });
      return !result.error;
    } catch (error) {
      if (isCancellation(error)) {
        return false;
      }
      throw error;
    }
  }

  private async pickAndCopy(options: {
    type: string[];
    allowMultiSelection: boolean;
  }): Promise<PickedFile[]> {
    let picked: DocumentPickerResponse[];
    try {
      picked = await pick({ ...options, mode: 'import' });
    } catch (error) {
      if (isCancellation(error)) {
        return [];
      }
      throw error;
    }
    const files = picked.filter(file => !file.error);
    const [first, ...rest] = files.map(file => ({
      uri: file.uri,
      fileName: sanitizeFileName(file.name ?? 'arquivo'),
    }));
    if (!first) {
      return [];
    }
    const copies = await keepLocalCopy({
      files: [first, ...rest],
      destination: 'cachesDirectory',
    });
    const result: PickedFile[] = [];
    for (const copy of copies) {
      if (copy.status !== 'success') {
        this.logger.warn('picker.copy_failed', { reason: copy.copyError });
        continue;
      }
      const source = files.find(file => file.uri === copy.sourceUri);
      result.push({
        localPath: uriToPath(copy.localUri),
        name: source?.name ?? 'arquivo',
        sizeBytes: source?.size ?? undefined,
        mimeType: source?.type ?? undefined,
      });
    }
    if (result.length === 0 && files.length > 0) {
      throw new FileNotFoundError('Could not read the selected files');
    }
    return result;
  }
}
