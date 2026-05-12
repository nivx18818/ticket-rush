import { Test } from '@nestjs/testing';
import { Prisma, UserGender, UserRole } from '@repo/db/prisma/client';

import {
  EmailAlreadyExistsException,
  UserNotFoundException,
} from '@/common/exceptions/app.exceptions';

import { PrismaService } from '../../../src/modules/prisma/prisma.service';
import { UsersService } from '../../../src/modules/users/users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
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

  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates customer users by default', async () => {
    prisma.user.create.mockResolvedValue(user);

    await expect(
      service.createUser({
        email: user.email,
        passwordHash: 'hashed-password',
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
      }),
    ).resolves.toEqual(user);

    const [createArgs] = prisma.user.create.mock.calls[0] as [
      { data: { passwordHash: string; role: UserRole } },
    ];

    expect(createArgs.data).toMatchObject({
      role: UserRole.CUSTOMER,
      passwordHash: 'hashed-password',
    });
  });

  it('maps duplicate emails to conflict errors', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['email'] },
      }),
    );

    await expect(
      service.createUser({
        email: user.email,
        passwordHash: 'hashed-password',
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
  });

  it('throws when a requested user is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getByIdOrThrow(user.id)).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
