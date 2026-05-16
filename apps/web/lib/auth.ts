import 'server-only';

import type { UserProfile } from '@/lib/api';

import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api/server';

export async function getCurrentUserOrNull(): Promise<UserProfile | null> {
  try {
    const { user } = await serverApi.getMe();

    return user;
  } catch (error) {
    if (isAuthApiError(error)) {
      return null;
    }

    throw error;
  }
}

export function isAuthApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && [401, 403].includes(error.status);
}
