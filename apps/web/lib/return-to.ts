const FALLBACK_RETURN_TO = '/';
const LOCAL_URL_ORIGIN = 'https://ticketrush.local';

export function sanitizeReturnTo(
  value: string | string[] | undefined,
  fallback = FALLBACK_RETURN_TO,
): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(rawValue, LOCAL_URL_ORIGIN);

    if (url.origin !== LOCAL_URL_ORIGIN) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeAuthReturnTo(value: string | string[] | undefined): string {
  const returnTo = sanitizeReturnTo(value);

  if (returnTo.startsWith('/login') || returnTo.startsWith('/register')) {
    return FALLBACK_RETURN_TO;
  }

  return returnTo;
}

export function buildLoginPath(returnTo: string): string {
  return `/login?${new URLSearchParams({ returnTo }).toString()}`;
}
