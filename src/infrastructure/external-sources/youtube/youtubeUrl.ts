import { parseHttpsUrl, pathSegments } from '@core/utils';

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
];
const SHORT_HOST = 'youtu.be';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

export type YouTubeReference =
  | { kind: 'video'; id: string }
  | { kind: 'playlist'; id: string };

export function parseYouTubeUrl(url: string): YouTubeReference | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed) {
    return null;
  }
  const segments = pathSegments(parsed.pathname);
  if (parsed.host === SHORT_HOST) {
    const id = segments[0];
    return id && VIDEO_ID.test(id) ? { kind: 'video', id } : null;
  }
  if (!YOUTUBE_HOSTS.includes(parsed.host)) {
    return null;
  }
  const video = parsed.query.v;
  if (
    (segments[0] === 'watch' || segments.length === 0) &&
    video &&
    VIDEO_ID.test(video)
  ) {
    return { kind: 'video', id: video };
  }
  if (
    (segments[0] === 'shorts' || segments[0] === 'live') &&
    segments[1] &&
    VIDEO_ID.test(segments[1])
  ) {
    return { kind: 'video', id: segments[1] };
  }
  const list = parsed.query.list;
  if (segments[0] === 'playlist' && list && LIST_ID.test(list)) {
    return { kind: 'playlist', id: list };
  }
  return null;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youTubePlaylistUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}
