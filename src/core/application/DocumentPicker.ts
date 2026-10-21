export interface PickedFile {
  /** Absolute path of an app-owned local copy of the picked document. */
  localPath: string;
  name: string;
  sizeBytes?: number;
  mimeType?: string;
}

/**
 * Port over the system document picker (Storage Access Framework on Android).
 * No broad storage permission is required: the user grants access per file.
 * Every method resolves to an empty result when the user dismisses the picker.
 */
export interface DocumentPicker {
  pickAudioFiles(): Promise<PickedFile[]>;
  pickImage(): Promise<PickedFile | null>;
  pickJsonFile(): Promise<PickedFile | null>;
  /** Lets the user choose where to save an app file. Returns false when dismissed. */
  saveFileAs(sourcePath: string, fileName: string, mimeType: string): Promise<boolean>;
}
