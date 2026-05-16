import { NextResponse, type NextRequest } from 'next/server';

import { buildLoginPath, sanitizeReturnTo } from '@/lib/return-to';

const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const returnTo = sanitizeReturnTo(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  const loginUrl = new URL(buildLoginPath(returnTo), request.url);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*'],
};
