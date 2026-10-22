import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@core/i18n';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import { getUserMessage } from '@core/errors';
import { COLLECTION_NAME_MAX_LENGTH } from '@features/collections';
import { STORAGE_SAFETY_MARGIN_BYTES } from '@features/downloads';
import {
  selectAll,
  summarizeSelection,
  toggleSelection,
  type ImportPreview,
  type ImportResult,
  type ImportTarget,
  type SourceAudioItem,
} from '../../index';

export type ImportPhase =
  | { kind: 'input' }
  | { kind: 'loading'; message: string }
  | { kind: 'error'; message: string; retry: () => void }
  | { kind: 'preview'; preview: ImportPreview };

/**
 * Drives the import flow: resolve source -> preview -> select -> confirm.
 * The UI never blocks during downloads: confirming only enqueues them.
 */
export function useImportViewModel(initialCollectionId?: string) {
  const { imports, storage, logger } = useDependencies();
  const [phase, setPhase] = useState<ImportPhase>({ kind: 'input' });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<ImportTarget>({ kind: 'none' });
  const [downloadNow, setDownloadNow] = useState(true);
  const [freeBytes, setFreeBytes] = useState<number>();
  const [submitting, setSubmitting] = useState(false);
  const confirmed = useRef(false);
  const previewRef = useRef<ImportPreview | null>(null);

  const showPreview = useCallback(
    (preview: ImportPreview) => {
      previewRef.current = preview;
      setSelection(selectAll(preview.items));
      setTarget(
        initialCollectionId
          ? { kind: 'existing', collectionId: initialCollectionId }
          : preview.items.length > 0
          ? {
              kind: 'new',
              name: preview.source.title.slice(0, COLLECTION_NAME_MAX_LENGTH),
            }
          : { kind: 'none' },
      );
      setPhase({ kind: 'preview', preview });
      storage
        .getUsage()
        .then(usage => setFreeBytes(usage.freeBytes))
        .catch(error => logger.warn('import.free_space_failed', {}, error));
    },
    [initialCollectionId, logger, storage],
  );

  const fetchUrl = useCallback(
    (url: string) => {
      setPhase({ kind: 'loading', message: t('imports.loadingMetadata') });
      imports
        .previewFromUrl(url)
        .then(showPreview)
        .catch(error => {
          logger.warn('import.preview_failed', {}, error);
          setPhase({
            kind: 'error',
            message: getUserMessage(error),
            retry: () => fetchUrl(url),
          });
        });
    },
    [imports, logger, showPreview],
  );

  const pickLocalFiles = useCallback(() => {
    setPhase({ kind: 'loading', message: t('imports.readingFiles') });
    imports
      .previewLocalFiles()
      .then(preview => (preview ? showPreview(preview) : setPhase({ kind: 'input' })))
      .catch(error => {
        logger.warn('import.local_failed', {}, error);
        setPhase({
          kind: 'error',
          message: getUserMessage(error),
          retry: pickLocalFiles,
        });
      });
  }, [imports, logger, showPreview]);

  const discard = useCallback(() => {
    const preview = previewRef.current;
    previewRef.current = null;
    if (preview && !confirmed.current) {
      imports
        .discardPreview(preview)
        .catch(error => logger.warn('import.discard_failed', {}, error));
    }
  }, [imports, logger]);

  // Temporary copies of device files are removed if the user leaves.
  useEffect(() => discard, [discard]);

  const reset = useCallback(() => {
    discard();
    setPhase({ kind: 'input' });
  }, [discard]);

  const items = useMemo<SourceAudioItem[]>(
    () => (phase.kind === 'preview' ? phase.preview.items : []),
    [phase],
  );
  const summary = useMemo(() => summarizeSelection(items, selection), [items, selection]);
  const hasDownloadable = items.some(
    item => selection.has(item.sourceId) && item.acquisition.kind === 'download',
  );
  const needsSpace = downloadNow && hasDownloadable ? summary.totalBytes : 0;
  const insufficientSpace =
    freeBytes !== undefined &&
    needsSpace > 0 &&
    freeBytes - needsSpace < STORAGE_SAFETY_MARGIN_BYTES;

  // Stable identity so memoized rows do not re-render on every selection change.
  const toggle = useCallback(
    (item: SourceAudioItem) => setSelection(previous => toggleSelection(previous, item)),
    [],
  );

  const confirm = useCallback(async (): Promise<ImportResult | null> => {
    if (phase.kind !== 'preview') {
      return null;
    }
    setSubmitting(true);
    try {
      const result = await imports.confirm({
        preview: phase.preview,
        selectedSourceIds: [...selection],
        target,
        downloadNow,
      });
      confirmed.current = true;
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [downloadNow, imports, phase, selection, target]);

  return {
    phase,
    items,
    selection,
    summary,
    target,
    setTarget,
    downloadNow,
    setDownloadNow,
    hasDownloadable,
    freeBytes,
    insufficientSpace,
    submitting,
    fetchUrl,
    pickLocalFiles,
    reset,
    confirm,
    toggle,
    selectAll: () => setSelection(selectAll(items)),
    clearSelection: () => setSelection(new Set()),
    supportedSources: imports.supportedSources(),
  };
}
