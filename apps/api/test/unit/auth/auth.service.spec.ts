import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn(),
  };

  const usersService = {
    createUser: jest.fn(),
    findByEmailWithPasswordHash: jest.fn(),
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('registers a customer with a bcrypt password hash and returns a signed token', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    jwtService.signAsync.mockResolvedValue('jwt-token');
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
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(result).toEqual({ accessToken: 'jwt-token', user });
  });

  it('rejects login when the email does not exist', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue(null);

    await expect(
      service.login({ email: user.email, password: 'Password1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when the password is invalid', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: user.email, password: 'WrongPassword1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with a valid password without returning the password hash', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({ email: user.email, password: 'Password1' });

    expect(result).toEqual({ accessToken: 'jwt-token', user });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
