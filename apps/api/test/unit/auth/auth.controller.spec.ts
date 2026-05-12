import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';

import { COOKIE_NAMES } from '../../../src/common/constants/cookie-config';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RefreshTokenService } from '../../../src/modules/auth/refresh-token.service';

describe('AuthController', () => {
  const user = {
    id: 'c6c792a0-dff7-48fc-a853-2e5cc850bd0a',
    email: 'user@example.com',
    name: 'Test User',
    dateOfBirth: new Date('1998-01-02'),
    gender: UserGender.OTHER,
    role: UserRole.CUSTOMER,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  };

  const authService = {
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    register: jest.fn(),
  };

  const refreshTokenService = {
    revokeByToken: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: RefreshTokenService,
          useValue: refreshTokenService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('sets an httpOnly JWT cookie on login', async () => {
    const response = {
      cookie: jest.fn(),
    };

    authService.login.mockResolvedValue({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
    });

    await controller.login({ email: user.email, password: 'Password1' }, response as never);

    expect(response.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      'jwt-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        secure: false,
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth/refresh',
        sameSite: 'strict',
        secure: false,
      }),
    );
  });

  it('clears the auth cookie on logout', async () => {
    const response = {
      clearCookie: jest.fn(),
    };

    await expect(controller.logout(user, response as never)).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(authService.logout).toHaveBeenCalledWith(user.id);
    expect(response.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
      }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth/refresh',
        sameSite: 'strict',
      }),
    );
  });

  it('rotates refresh token and sets new auth cookies', async () => {
    const response = {
      cookie: jest.fn(),
    };
    const request = {
      cookies: {
        [COOKIE_NAMES.REFRESH_TOKEN]: 'refresh-token',
      },
    };

    authService.refresh.mockResolvedValue({
      accessToken: 'next-jwt-token',
      refreshToken: 'next-refresh-token',
    });
    await expect(controller.refresh(request as never, user, response as never)).resolves.toEqual({
      message: 'Token refreshed',
    });

    expect(refreshTokenService.revokeByToken).toHaveBeenCalledWith('refresh-token');
    expect(authService.refresh).toHaveBeenCalledWith(user);
    expect(response.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      'next-jwt-token',
      expect.any(Object),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      'next-refresh-token',
      expect.any(Object),
    );
  });
});
