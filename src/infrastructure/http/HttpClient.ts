import type { ZodType } from 'zod';

export interface HttpRequestOptions {
  timeoutMs?: number;
}

export interface HeadResult {
  status: number;
  contentType?: string;
  contentLength?: number;
}

/** Typed HTTP client: JSON responses are validated against a schema. */
export interface HttpClient {
  getJson<T>(url: string, schema: ZodType<T>, options?: HttpRequestOptions): Promise<T>;
  head(url: string, options?: HttpRequestOptions): Promise<HeadResult>;
}
