import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedRequestUser, JwtPayload } from '../type/auth.types';

import { InvalidTokenException } from '../../../common/exceptions/app.exceptions';
import { UsersService } from '../../users/users.service';
import { cookieExtractor } from '../utils/cookie-extractor';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor('ACCESS_TOKEN')]),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedRequestUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new InvalidTokenException();
    }

    return user;
  }
}
