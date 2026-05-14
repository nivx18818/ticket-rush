import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { createParamDecorator } from '@nestjs/common';

import type { AuthenticatedRequestUser } from '../types/auth';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedRequestUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
