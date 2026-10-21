/** Minimal item shape the selection rules need (keeps the domain source-agnostic). */
export interface SelectableItem {
  sourceId: string;
  sizeBytes?: number;
  availability: 'available' | 'restricted';
}

export function isSelectable(item: SelectableItem): boolean {
  return item.availability !== 'restricted';
}

export function selectAll(items: readonly SelectableItem[]): Set<string> {
  return new Set(items.filter(isSelectable).map(item => item.sourceId));
}

export function toggleSelection(
  selection: ReadonlySet<string>,
  item: SelectableItem,
): Set<string> {
  const next = new Set(selection);
  if (next.has(item.sourceId)) {
    next.delete(item.sourceId);
  } else if (isSelectable(item)) {
    next.add(item.sourceId);
  }
  return next;
}

export interface SelectionSummary {
  count: number;
  totalBytes: number;
  /** Items whose size the source did not report. */
  unknownSizeCount: number;
}

export function summarizeSelection(
  items: readonly SelectableItem[],
  selection: ReadonlySet<string>,
): SelectionSummary {
  let totalBytes = 0;
  let unknownSizeCount = 0;
  let count = 0;
  for (const item of items) {
    if (!selection.has(item.sourceId)) {
      continue;
    }
    count++;
    if (item.sizeBytes && item.sizeBytes > 0) {
      totalBytes += item.sizeBytes;
    } else {
      unknownSizeCount++;
    }
  }
  return { count, totalBytes, unknownSizeCount };
}
