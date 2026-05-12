import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';

import { InvalidTokenException } from '@/common/exceptions/app.exceptions';

import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { UsersService } from '../../../src/modules/users/users.service';

describe('JwtStrategy', () => {
  const user = {
    id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
    email: 'admin@example.com',
    name: 'Admin User',
    dateOfBirth: new Date('1990-01-01'),
    gender: UserGender.OTHER,
    role: UserRole.ADMIN,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  };

  const usersService = {
    findById: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.resetAllMocks();
    configService.getOrThrow.mockReturnValue('test-jwt-secret');

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('validates the JWT subject against the users service', async () => {
    usersService.findById.mockResolvedValue(user);

    await expect(
      strategy.validate({ sub: user.id, email: user.email, role: user.role }),
    ).resolves.toEqual(user);
    expect(usersService.findById).toHaveBeenCalledWith(user.id);
  });

  it('rejects tokens for deleted users', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: user.id, email: user.email, role: user.role }),
    ).rejects.toBeInstanceOf(InvalidTokenException);
  });
});
