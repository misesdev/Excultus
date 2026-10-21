/**
 * Minimal, dependency-free URL parser. React Native's URL polyfill does not
 * implement every accessor (e.g. `hostname`), so parsing is done here with a
 * strict pattern that also doubles as input validation.
 */
export interface ParsedUrl {
  href: string;
  protocol: 'http' | 'https';
  host: string;
  pathname: string;
  query: Record<string, string>;
}

const URL_PATTERN =
  /^(https?):\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)(?::\d{1,5})?(\/[^?#\s]*)?(?:\?([^#\s]*))?(?:#\S*)?$/i;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function parseUrl(input: string): ParsedUrl | null {
  const trimmed = input.trim();
  const match = URL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }
  const [, protocol, host, pathname, search] = match;
  const query: Record<string, string> = {};
  if (search) {
    for (const pair of search.split('&')) {
      if (!pair) {
        continue;
      }
      const [key, value = ''] = pair.split('=');
      if (key) {
        query[safeDecode(key)] = safeDecode(value);
      }
    }
  }
  return {
    href: trimmed,
    protocol: (protocol ?? 'https').toLowerCase() as ParsedUrl['protocol'],
    host: (host ?? '').toLowerCase(),
    pathname: pathname ?? '/',
    query,
  };
}

/** Returns the parsed URL only when it uses HTTPS. */
export function parseHttpsUrl(input: string): ParsedUrl | null {
  const parsed = parseUrl(input);
  return parsed?.protocol === 'https' ? parsed : null;
}

export function pathSegments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter(segment => segment.length > 0)
    .map(safeDecode);
}

/** Encodes each path segment while preserving separators. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function fileExtension(fileName: string): string | undefined {
  // Query/fragment only exist in URLs; plain file names may contain "#" or "?".
  const clean = fileName.includes('://') ? fileName.split(/[?#]/)[0] ?? '' : fileName;
  const lastSegment = clean.split('/').pop() ?? '';
  const dot = lastSegment.lastIndexOf('.');
  if (dot <= 0 || dot === lastSegment.length - 1) {
    return undefined;
  }
  return lastSegment.slice(dot + 1).toLowerCase();
}

export function fileBaseName(fileName: string): string {
  const lastSegment = fileName.split('/').pop() ?? fileName;
  const dot = lastSegment.lastIndexOf('.');
  return dot > 0 ? lastSegment.slice(0, dot) : lastSegment;
}
