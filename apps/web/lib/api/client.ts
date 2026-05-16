'use client';

import type { z } from 'zod';

import { createTicketRushApi } from './contract';
import { requestJson, type ApiRequestInit } from './request';

function clientApiFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: ApiRequestInit,
): Promise<z.infer<TSchema>> {
  return requestJson(path, schema, {
    ...init,
    credentials: 'include',
  });
}

export const clientApi = createTicketRushApi(clientApiFetch);
export { clientApiFetch };
