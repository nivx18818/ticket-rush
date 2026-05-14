import type { StringValue } from 'ms';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  AUTH_PASSWORD_SALT_ROUNDS,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN_MS,
} from '@/common/constants/auth.constants';
import { InvalidCredentialsException } from '@/common/exceptions/app.exceptions';

import type { UserProfileDto } from '../users/dto/users.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/auth';

import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfileDto> {
    const passwordHash = await bcrypt.hash(dto.password, AUTH_PASSWORD_SALT_ROUNDS);

    return this.usersService.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
    });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPasswordHash(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const { passwordHash: _passwordHash, ...profile } = user;

    return this.issueTokens(profile);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllByUser(userId);
  }

  async refresh(user: UserProfileDto): Promise<AuthTokens> {
    return this.issueTokens(user);
  }

  private async issueTokens(user: UserProfileDto): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<StringValue>('JWT_EXPIRES_IN', JWT_EXPIRES_IN),
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<StringValue>(
          'JWT_REFRESH_EXPIRES_IN',
          REFRESH_TOKEN_EXPIRES_IN,
        ),
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      }),
    ]);

    await this.refreshTokenService.create(
      user.id,
      refreshToken,
      new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
