import type { Request } from 'express';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedRequestUser, JwtPayload } from '../type/auth.types';

import { AUTH_COOKIE_NAME } from '../../../common/constants/auth.constants';
import { UsersService } from '../../users/users.service';

type CookieRequest = Omit<Request, 'cookies'> & {
  cookies?: unknown;
};

const isCookieRecord = (value: unknown): value is Record<string, string | undefined> =>
  typeof value === 'object' && value !== null;

const extractJwtFromCookie = (request: CookieRequest): string | null => {
  if (!isCookieRecord(request.cookies)) {
    return null;
  }

  return request.cookies[AUTH_COOKIE_NAME] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedRequestUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return user;
  }
}
