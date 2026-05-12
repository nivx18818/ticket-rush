import type { CookieOptions } from 'express';

import { REFRESH_TOKEN_EXPIRES_IN_MS } from './auth.constants';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const BASE_COOKIE_OPTIONS: CookieOptions = {
  domain: process.env.COOKIE_DOMAIN,
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
};

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000,
  path: '/',
};

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_EXPIRES_IN_MS,
  path: '/api/v1/auth/refresh',
};

export const CLEAR_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 0,
  path: '/',
};

export const REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS: CookieOptions = {
  ...CLEAR_COOKIE_OPTIONS,
  path: REFRESH_TOKEN_COOKIE_OPTIONS.path,
};
