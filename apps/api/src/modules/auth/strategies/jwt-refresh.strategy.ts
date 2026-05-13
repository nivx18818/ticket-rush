import type { Request } from 'express';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import {
  InvalidTokenException,
  MissingAuthenticationException,
  RefreshTokenInvalidException,
} from '@/common/exceptions/app.exceptions';
import { UsersService } from '@/modules/users/users.service';

import type { AuthenticatedRequestUser, JwtPayload } from '../type/auth.types';

import { RefreshTokenService } from '../refresh-token.service';
import { cookieExtractor } from '../utils/cookie-extractor';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
  ) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor('REFRESH_TOKEN')]),
      passReqToCallback: true,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<AuthenticatedRequestUser> {
    const refreshToken = cookieExtractor('REFRESH_TOKEN')(request);

    if (!refreshToken) {
      throw new MissingAuthenticationException();
    }

    const persistedToken = await this.refreshTokenService.findValid(payload.sub, refreshToken);

    if (!persistedToken) {
      throw new RefreshTokenInvalidException();
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new InvalidTokenException();
    }

    return user;
  }
}
