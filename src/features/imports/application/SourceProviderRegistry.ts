import { InvalidSourceUrlError } from '@core/errors';
import { parseHttpsUrl } from '@core/utils';
import type { AudioSourceProvider } from './AudioSourceProvider';

/**
 * Chooses the provider for a URL. New sources are added by registering a
 * provider in the composition root; nothing else changes.
 */
export class SourceProviderRegistry {
  constructor(private readonly providers: readonly AudioSourceProvider[]) {}

  resolve(url: string): AudioSourceProvider {
    if (!parseHttpsUrl(url)) {
      throw new InvalidSourceUrlError('Only valid HTTPS URLs are accepted', {
        details: { url },
      });
    }
    const provider = this.providers.find(candidate => candidate.canHandle(url));
    if (!provider) {
      throw new InvalidSourceUrlError('No provider can handle this URL', {
        details: { url },
      });
    }
    return provider;
  }

  labels(): string[] {
    return this.providers.map(provider => provider.label);
  }
}
