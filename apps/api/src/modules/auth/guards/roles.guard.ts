import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@repo/db/prisma/client';
import type { Request } from 'express';

import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppForbiddenException } from '@/common/exceptions/app.exceptions';

import type { AuthenticatedRequestUser } from '../types/auth';

import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestWithUser = Request & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new AppForbiddenException();
  }
}
