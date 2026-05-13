import type { Request } from 'express';

import { COOKIE_NAMES } from '@/common/constants/cookie-config';

export const cookieExtractor =
  (name: keyof typeof COOKIE_NAMES) =>
  (request: Request): string | null => {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[COOKIE_NAMES[name]];

    return typeof token === 'string' ? token : null;
  };
