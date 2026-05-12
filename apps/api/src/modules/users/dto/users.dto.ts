import type { UserGender, UserRole } from '@repo/db/prisma/client';

export class UserProfileDto {
  id!: string;
  email!: string;
  name!: string;
  dateOfBirth!: Date;
  gender!: UserGender;
  role!: UserRole;
  createdAt!: Date;
}

export class UserWithPasswordHashDto extends UserProfileDto {
  passwordHash!: string;
}
