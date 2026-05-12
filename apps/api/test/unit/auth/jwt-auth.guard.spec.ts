import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';

import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const user = {
    id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
    email: 'admin@example.com',
    name: 'Admin User',
    dateOfBirth: new Date('1990-01-01'),
    gender: UserGender.OTHER,
    role: UserRole.ADMIN,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  };

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const createContext = (request: Record<string, unknown>) =>
    ({
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as never;

  let guard: JwtAuthGuard;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  it('allows public routes without a cookie', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(createContext({ cookies: {} }))).toBe(true);
  });

  it('returns the strategy user from handleRequest', () => {
    expect(guard.handleRequest(null, user)).toEqual(user);
  });

  it('rejects requests when passport does not provide a user', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });
});
