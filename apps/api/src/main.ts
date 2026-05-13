import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import type { CorsOriginMatcher } from './utils/resolve-cors-origin-matchers';

import { AppModule } from './app.module';
import { normalizeOrigin, resolveCorsOriginMatchers } from './utils/resolve-cors-origin-matchers';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOriginMatchers = resolveCorsOriginMatchers();

  if (corsOriginMatchers.length === 0) {
    logger.warn('No CLIENT_URL configured. Browser CORS requests will be rejected.');
  }

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    credentials: true,
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Requests without Origin are typically server-to-server or health checks.
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = corsOriginMatchers.some((matches: CorsOriginMatcher) =>
        matches(normalizedOrigin),
      );

      callback(
        isAllowed ? null : new Error(`Origin "${origin}" is not allowed by CORS`),
        isAllowed,
      );
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(Number(configService.get<string>('PORT') ?? 3001));
}

void bootstrap();
