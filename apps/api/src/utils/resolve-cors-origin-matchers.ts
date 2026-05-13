export type CorsOriginMatcher = (origin: string) => boolean;

export const normalizeOrigin = (value: string): string => {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');
};

export const resolveCorsOriginMatchers = (): CorsOriginMatcher[] => {
  const rawOrigins = [process.env.CLIENT_URL ?? ''];

  const fallbackOrigins =
    process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const allowedOrigins = rawOrigins[0] !== '' ? rawOrigins : fallbackOrigins;

  return allowedOrigins.map((allowedOrigin) => {
    const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

    if (!normalizedAllowedOrigin.includes('*')) {
      return (origin: string) => origin === normalizedAllowedOrigin;
    }

    const escapedPattern = normalizedAllowedOrigin
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const pattern = new RegExp(`^${escapedPattern}$`);

    return (origin: string) => pattern.test(origin);
  });
};
