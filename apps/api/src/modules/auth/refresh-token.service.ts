import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@repo/db/prisma/client';
import { createHmac } from 'node:crypto';

import {
  InternalServerErrorException,
  RefreshTokenAlreadyExistsException,
  UserNotFoundException,
} from '@/common/exceptions/app.exceptions';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly refreshTokenHashSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const secret =
      configService.get<string>('JWT_REFRESH_TOKEN_HASH_SECRET') ??
      configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new InternalServerErrorException('JWT_REFRESH_TOKEN_HASH_SECRET is not defined');
    }

    this.refreshTokenHashSecret = secret;
  }

  async create(userId: string, refreshToken: string, expiresAt: Date) {
    const tokenHash = this.hashToken(refreshToken);

    try {
      return await this.prisma.refreshToken.create({
        data: {
          expiresAt,
          tokenHash,
          userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new RefreshTokenAlreadyExistsException();
        }

        if (error.code === 'P2003') {
          throw new UserNotFoundException(userId);
        }
      }

      throw error;
    }
  }

  async findValid(userId: string, refreshToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        tokenHash: this.hashToken(refreshToken),
        userId,
      },
    });
  }

  async revokeByToken(refreshToken: string) {
    return this.prisma.refreshToken.deleteMany({
      where: {
        tokenHash: this.hashToken(refreshToken),
      },
    });
  }

  async revokeAllByUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private hashToken(token: string): string {
    return createHmac('sha256', this.refreshTokenHashSecret).update(token).digest('hex');
  }
}
