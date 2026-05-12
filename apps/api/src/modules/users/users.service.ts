import type { UserGender } from '@repo/db/prisma/client';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import type { UserProfileDto, UserWithPasswordHashDto } from './dto/users.dto';

import { PrismaService } from '../prisma/prisma.service';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  dateOfBirth: true,
  gender: true,
  role: true,
  createdAt: true,
} as const;

const USER_WITH_PASSWORD_SELECT = {
  ...USER_PROFILE_SELECT,
  passwordHash: true,
} as const;

const isUniqueConstraintError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'P2002';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(input: {
    email: string;
    passwordHash: string;
    name: string;
    dateOfBirth: Date;
    gender: UserGender;
  }): Promise<UserProfileDto> {
    try {
      return await this.prisma.user.create({
        data: {
          ...input,
          role: UserRole.CUSTOMER,
        },
        select: USER_PROFILE_SELECT,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered.');
      }

      throw error;
    }
  }

  async findAllProfiles(): Promise<UserProfileDto[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_PROFILE_SELECT,
    });
  }

  async findByEmailWithPasswordHash(email: string): Promise<UserWithPasswordHashDto | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_WITH_PASSWORD_SELECT,
    });
  }

  async findById(id: string): Promise<UserProfileDto | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_PROFILE_SELECT,
    });
  }

  async getByIdOrThrow(id: string): Promise<UserProfileDto> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }
}
