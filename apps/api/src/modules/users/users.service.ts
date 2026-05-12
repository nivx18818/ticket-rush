import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@repo/db/prisma/client';

import {
  EmailAlreadyExistsException,
  UserNotFoundException,
} from '@/common/exceptions/app.exceptions';

import type { CreateUserDto } from './dto/create-user.dto';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserProfileDto> {
    const { role = UserRole.CUSTOMER, ...userData } = createUserDto;

    try {
      return await this.prisma.user.create({
        data: {
          ...userData,
          role,
        },
        select: USER_PROFILE_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] | undefined;
          const field = target?.[0];

          if (field === 'email') {
            throw new EmailAlreadyExistsException(createUserDto.email);
          }
        }
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
      throw new UserNotFoundException(id);
    }

    return user;
  }
}
