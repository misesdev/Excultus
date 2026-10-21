/**
 * @jest-environment node
 */
import { YouTubeMediaUrlResolver } from '@infrastructure/external-sources/youtube/YouTubeMediaUrlResolver';
import { parseYouTubeUrl } from '@infrastructure/external-sources/youtube/youtubeUrl';
import { FakeYouTubeExtractor } from '@test/support/fakes';

describe('parseYouTubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'video'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['https://youtu.be/dQw4w9WgXcQ', 'video'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'video'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'video'],
  ])('recognizes the video in %s', (url, kind) => {
    expect(parseYouTubeUrl(url)).toEqual({ kind, id: 'dQw4w9WgXcQ' });
  });

  it('recognizes playlists', () => {
    expect(
      parseYouTubeUrl(
        'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
      ),
    ).toEqual({ kind: 'playlist', id: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' });
  });

  it.each([
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/@canal',
    'https://www.youtube.com/playlist',
    'não é url',
  ])('rejects %s', url => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});

describe('YouTubeMediaUrlResolver', () => {
  it('resolves a fresh media URL and size for YouTube videos', async () => {
    const extractor = new FakeYouTubeExtractor();
    extractor.addVideo('dQw4w9WgXcQ', { contentLength: 1234 });
    const resolver = new YouTubeMediaUrlResolver(extractor);

    const first = await resolver.resolve('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const second = await resolver.resolve('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(first).toEqual({
      url: expect.stringMatching(/googlevideo/),
      totalBytes: 1234,
    });
    expect(second.url).not.toBe(first.url);
  });

  it('passes any other URL through without calling YouTube', async () => {
    const extractor = new FakeYouTubeExtractor();
    const resolver = new YouTubeMediaUrlResolver(extractor);
    const url = 'https://archive.org/download/item/a.mp3';

    await expect(resolver.resolve(url)).resolves.toEqual({ url });
    expect(extractor.resolved).toHaveLength(0);
  });
});
