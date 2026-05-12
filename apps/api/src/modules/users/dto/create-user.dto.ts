import type { UserGender, UserRole } from '@repo/db/prisma/client';

export class CreateUserDto {
  email!: string;
  passwordHash!: string;
  name!: string;
  dateOfBirth!: Date;
  gender!: UserGender;
  role?: UserRole;
}
