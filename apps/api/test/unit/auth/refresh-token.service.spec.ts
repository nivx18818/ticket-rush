import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';

import { RefreshTokenService } from '../../../src/modules/auth/refresh-token.service';
import { PrismaService } from '../../../src/modules/prisma/prisma.service';

type CreateRefreshTokenArgs = {
  data: {
    expiresAt: Date;
    tokenHash: string;
    userId: string;
  };
};

type FindValidRefreshTokenArgs = {
  where: {
    expiresAt: {
      gt: Date;
    };
    tokenHash: string;
    userId: string;
  };
};

type DeleteManyRefreshTokenArgs = {
  where: {
    tokenHash?: string;
    userId?: string;
  };
};

describe('RefreshTokenService', () => {
  const refreshTokenHashSecret = 'test-refresh-token-hash-secret';
  const refreshTokenCreate = jest.fn<(args: CreateRefreshTokenArgs) => Promise<unknown>>();
  const refreshTokenDeleteMany = jest.fn<(args: DeleteManyRefreshTokenArgs) => Promise<unknown>>();
  const refreshTokenFindFirst = jest.fn<(args: FindValidRefreshTokenArgs) => Promise<unknown>>();

  const prisma = {
    refreshToken: {
      create: refreshTokenCreate,
      deleteMany: refreshTokenDeleteMany,
      findFirst: refreshTokenFindFirst,
    },
  };

  const configService = {
    get: jest.fn(),
  };

  let service: RefreshTokenService;

  beforeEach(async () => {
    jest.resetAllMocks();
    configService.get.mockImplementation((key: string) =>
      key === 'JWT_REFRESH_TOKEN_HASH_SECRET' ? refreshTokenHashSecret : undefined,
    );
    refreshTokenCreate.mockResolvedValue({});
    refreshTokenDeleteMany.mockResolvedValue({ count: 1 });
    refreshTokenFindFirst.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = moduleRef.get(RefreshTokenService);
  });

  it('creates a refresh token record with a keyed hash', async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    await service.create('user-id', 'refresh-token', expiresAt);

    const expectedHash = createHmac('sha256', refreshTokenHashSecret)
      .update('refresh-token')
      .digest('hex');

    expect(refreshTokenCreate).toHaveBeenCalledWith({
      data: {
        expiresAt,
        tokenHash: expectedHash,
        userId: 'user-id',
      },
    });
  });

  it('finds a valid refresh token by user id and keyed hash', async () => {
    await service.findValid('user-id', 'refresh-token');

    const [[findArgs]] = refreshTokenFindFirst.mock.calls as [[FindValidRefreshTokenArgs]];

    expect(findArgs.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(findArgs.where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(findArgs.where.userId).toBe('user-id');
  });

  it('revokes refresh token records by token or user', async () => {
    await service.revokeByToken('refresh-token');
    await service.revokeAllByUser('user-id');

    const [revokeByTokenCall, revokeAllByUserCall] = refreshTokenDeleteMany.mock.calls as [
      [DeleteManyRefreshTokenArgs],
      [DeleteManyRefreshTokenArgs],
    ];

    expect(revokeByTokenCall[0].where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(revokeAllByUserCall[0].where.userId).toBe('user-id');
  });
});
