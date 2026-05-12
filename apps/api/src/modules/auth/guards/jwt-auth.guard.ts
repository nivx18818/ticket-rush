import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import type { AuthenticatedRequestUser } from '../type/auth.types';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedRequestUser>(error: unknown, user: TUser | false | null) {
    if (error instanceof Error) {
      throw error;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication cookie is missing or invalid.');
    }

    return user;
  }
}
