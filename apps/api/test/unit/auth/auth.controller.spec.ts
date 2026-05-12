import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserGender, UserRole } from '@repo/db/prisma/client';

import { AUTH_COOKIE_NAME } from '../../../src/common/constants/auth.constants';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';

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
    register: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
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
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('sets an httpOnly JWT cookie on login', async () => {
    const response = {
      cookie: jest.fn(),
    };

    authService.login.mockResolvedValue({ accessToken: 'jwt-token', user });
    configService.get.mockReturnValue('test');

    await controller.login({ email: user.email, password: 'Password1' }, response as never);

    expect(response.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      'jwt-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
      }),
    );
  });

  it('clears the auth cookie on logout', () => {
    const response = {
      clearCookie: jest.fn(),
    };

    configService.get.mockReturnValue('test');

    expect(controller.logout(response as never)).toEqual({ success: true });
    expect(response.clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      }),
    );
  });
});
