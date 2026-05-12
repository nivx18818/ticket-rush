import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import type { UserProfileDto } from '../users/dto/users.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './type/auth.types';

import { AUTH_PASSWORD_SALT_ROUNDS } from '../../common/constants/auth.constants';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: UserProfileDto }> {
    const passwordHash = await bcrypt.hash(dto.password, AUTH_PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
    });

    return {
      accessToken: await this.signAccessToken(user),
      user,
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: UserProfileDto }> {
    const user = await this.usersService.findByEmailWithPasswordHash(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { passwordHash: _passwordHash, ...profile } = user;

    return {
      accessToken: await this.signAccessToken(profile),
      user: profile,
    };
  }

  private signAccessToken(user: UserProfileDto): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }
}
