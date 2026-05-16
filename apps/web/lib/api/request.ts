import { z } from 'zod';

import { publicEnv } from '@/lib/env';

export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly payload: unknown;
  readonly status: number;
  readonly statusText: string;

  constructor(response: Response, payload: unknown) {
    super(resolveErrorMessage(payload, `${response.status} ${response.statusText}`));
    this.name = 'ApiError';
    this.payload = payload;
    this.status = response.status;
    this.statusText = response.statusText;
  }
}

export class ApiResponseParseError extends Error {
  readonly cause: z.ZodError;

  constructor(cause: z.ZodError) {
    super(z.prettifyError(cause));
    this.cause = cause;
    this.name = 'ApiResponseParseError';
  }
}

export async function requestJson<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init: ApiRequestInit = {},
): Promise<z.infer<TSchema>> {
  const headers = buildHeaders(init.headers, init.body);
  const response = await fetch(buildApiUrl(path), {
    ...init,
    body: serializeBody(init.body),
    credentials: init.credentials ?? 'include',
    headers,
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(response, payload);
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiResponseParseError(parsed.error);
  }

  return parsed.data;
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${publicEnv.NEXT_PUBLIC_API_BASE_URL}${normalizedPath}`;
}

export function getRealtimeBaseUrl(): string {
  const url = new URL(publicEnv.NEXT_PUBLIC_API_BASE_URL);

  url.hash = '';
  url.pathname = '';
  url.search = '';

  return url.toString().replace(/\/+$/, '');
}

function buildHeaders(headers: HeadersInit | undefined, body: unknown): Headers {
  const nextHeaders = new Headers(headers);

  nextHeaders.set('Accept', 'application/json');

  if (body !== undefined && !(body instanceof FormData) && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  return nextHeaders;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMessageValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.join(', ');
  }

  return null;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  return text.length > 0 ? { message: text } : undefined;
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = readMessageValue(payload.message);

    if (message) {
      return message;
    }

    const error = readMessageValue(payload.error);

    if (error) {
      return error;
    }
  }

  return fallback;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}
