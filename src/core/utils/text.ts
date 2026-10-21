const HTML_TAG = /<[^>]*>/g;
const HTML_BREAK = /<\s*\/?\s*(br|div|p|li)\b[^>]*>/gi;
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** Converts HTML descriptions (common in Archive.org) into plain text. */
export function stripHtml(input: string): string {
  return input
    .replace(HTML_BREAK, '\n')
    .replace(HTML_TAG, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, entity => ENTITIES[entity] ?? entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const collator = { compare: (a: string, b: string) => a.localeCompare(b, 'pt-BR') };

/** Natural ordering: "Aula 2" < "Aula 10". */
export function naturalCompare(a: string, b: string): number {
  const chunk = /(\d+|\D+)/g;
  const partsA = a.toLowerCase().match(chunk) ?? [];
  const partsB = b.toLowerCase().match(chunk) ?? [];
  const length = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const left = partsA[i] as string;
    const right = partsB[i] as string;
    if (left === right) {
      continue;
    }
    const numberA = Number(left);
    const numberB = Number(right);
    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
      return numberA - numberB;
    }
    return collator.compare(left, right);
  }
  return partsA.length - partsB.length;
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function firstNonEmpty(
  ...values: Array<string | undefined | null>
): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}
