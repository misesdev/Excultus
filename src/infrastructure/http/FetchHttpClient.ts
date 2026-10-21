import type { ZodType } from 'zod';
import {
  InvalidResponseError,
  NetworkError,
  PermissionDeniedError,
  SourceUnavailableError,
} from '@core/errors';
import { parseHttpsUrl } from '@core/utils';
import type { HeadResult, HttpClient, HttpRequestOptions } from './HttpClient';

const DEFAULT_TIMEOUT_MS = 20000;

type FetchFn = typeof fetch;

/** fetch-based client: HTTPS only, timeouts, typed errors and schema validation. */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly fetchImpl: FetchFn = fetch) {}

  async getJson<T>(
    url: string,
    schema: ZodType<T>,
    options: HttpRequestOptions = {},
  ): Promise<T> {
    const response = await this.request(url, 'GET', options);
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new InvalidResponseError('Response is not valid JSON', {
        cause: error,
        details: { url },
      });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new InvalidResponseError('Response does not match the expected shape', {
        details: { url, issue: parsed.error.issues[0]?.message },
      });
    }
    return parsed.data;
  }

  async head(url: string, options: HttpRequestOptions = {}): Promise<HeadResult> {
    const response = await this.request(url, 'HEAD', options);
    const length = Number(response.headers.get('content-length'));
    return {
      status: response.status,
      contentType: response.headers.get('content-type') ?? undefined,
      contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
    };
  }

  private async request(
    url: string,
    method: 'GET' | 'HEAD',
    options: HttpRequestOptions,
  ): Promise<Response> {
    if (!parseHttpsUrl(url)) {
      throw new PermissionDeniedError('Only HTTPS requests are allowed', {
        details: { url },
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new NetworkError('Request failed', {
        cause: error,
        details: { url, method },
      });
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 404 || response.status === 410 || response.status === 403) {
      throw new SourceUnavailableError(`HTTP ${response.status}`, {
        details: { url, status: response.status },
      });
    }
    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}`, {
        details: { url, status: response.status },
      });
    }
    return response;
  }
}
