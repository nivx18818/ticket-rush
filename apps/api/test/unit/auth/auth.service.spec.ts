import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';
import * as bcrypt from 'bcrypt';

import { InvalidCredentialsException } from '@/common/exceptions/app.exceptions';

import { AuthService } from '../../../src/modules/auth/auth.service';
import { RefreshTokenService } from '../../../src/modules/auth/refresh-token.service';
import { UsersService } from '../../../src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const usersService = {
    createUser: jest.fn(),
    findByEmailWithPasswordHash: jest.fn(),
  };

  const refreshTokenService = {
    create: jest.fn(),
    revokeAllByUser: jest.fn(),
  };

  const user = {
    id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
    email: 'user@example.com',
    name: 'Test User',
    dateOfBirth: new Date('1998-01-02'),
    gender: UserGender.OTHER,
    role: UserRole.CUSTOMER,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    configService.get.mockImplementation((_key: string, fallback: string) => fallback);
    configService.getOrThrow.mockImplementation((key: string) => `${key}-secret`);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: RefreshTokenService,
          useValue: refreshTokenService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('registers a customer with a bcrypt password hash', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    usersService.createUser.mockResolvedValue(user);

    const result = await service.register({
      email: user.email,
      password: 'Password1',
      name: user.name,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 12);
    expect(usersService.createUser).toHaveBeenCalledWith({
      email: user.email,
      passwordHash: 'hashed-password',
      name: user.name,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
    });
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(refreshTokenService.create).not.toHaveBeenCalled();
    expect(result).toEqual(user);
  });

  it('rejects login when the email does not exist', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue(null);

    await expect(
      service.login({ email: user.email, password: 'Password1' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('rejects login when the password is invalid', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: user.email, password: 'WrongPassword1' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('logs in with a valid password without returning the password hash', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.signAsync.mockResolvedValueOnce('jwt-token').mockResolvedValueOnce('refresh-token');
    refreshTokenService.create.mockResolvedValue({});

    const result = await service.login({ email: user.email, password: 'Password1' });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      expect.objectContaining({
        secret: 'JWT_SECRET-secret',
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      expect.objectContaining({
        secret: 'JWT_REFRESH_SECRET-secret',
      }),
    );
    expect(refreshTokenService.create).toHaveBeenCalledWith(
      user.id,
      'refresh-token',
      expect.any(Date),
    );
    expect(result).toEqual({ accessToken: 'jwt-token', refreshToken: 'refresh-token' });
  });

  it('refreshes tokens for an authenticated refresh user', async () => {
    jwtService.signAsync
      .mockResolvedValueOnce('next-jwt-token')
      .mockResolvedValueOnce('next-refresh-token');
    refreshTokenService.create.mockResolvedValue({});

    const result = await service.refresh(user);

    expect(refreshTokenService.create).toHaveBeenCalledWith(
      user.id,
      'next-refresh-token',
      expect.any(Date),
    );
    expect(result).toEqual({
      accessToken: 'next-jwt-token',
      refreshToken: 'next-refresh-token',
    });
  });

  it('revokes all refresh tokens on logout', async () => {
    await service.logout(user.id);

    expect(refreshTokenService.revokeAllByUser).toHaveBeenCalledWith(user.id);
  });
});
