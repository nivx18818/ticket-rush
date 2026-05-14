import type { UserRole } from '@repo/db/prisma/client';

import type { UserProfileDto } from '@/modules/users/dto/users.dto';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequestUser = UserProfileDto;
