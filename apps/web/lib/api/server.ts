import 'server-only';

import type { z } from 'zod';

import { cookies } from 'next/headers';

import { createTicketRushApi } from './contract';
import { requestJson, type ApiRequestInit } from './request';

async function serverApiFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: ApiRequestInit,
): Promise<z.infer<TSchema>> {
  const headers = new Headers(init?.headers);
  const cookieHeader = (await cookies()).toString();

  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  return requestJson(path, schema, {
    cache: 'no-store',
    ...init,
    credentials: 'include',
    headers,
  });
}

export const serverApi = createTicketRushApi(serverApiFetch);
export { serverApiFetch };
