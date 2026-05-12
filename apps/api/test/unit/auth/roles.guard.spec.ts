import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';

import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';

describe('RolesGuard', () => {
  const user = {
    id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
    email: 'user@example.com',
    name: 'Test User',
    dateOfBirth: new Date('1998-01-02'),
    gender: UserGender.OTHER,
    role: UserRole.CUSTOMER,
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

  let guard: RolesGuard;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = moduleRef.get(RolesGuard);
  });

  it('allows routes with no required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ user }))).toBe(true);
  });

  it('allows matching roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.CUSTOMER]);

    expect(guard.canActivate(createContext({ user }))).toBe(true);
  });

  it('blocks non-admin users from admin-only routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createContext({ user }))).toThrow(ForbiddenException);
  });
});
