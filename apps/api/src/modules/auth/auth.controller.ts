import type { CookieOptions, Response } from 'express';

import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { UserProfileDto } from '../users/dto/users.dto';
import type { AuthenticatedRequestUser } from './type/auth.types';

import { AUTH_COOKIE_NAME, JWT_COOKIE_MAX_AGE_MS } from '../../common/constants/auth.constants';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserProfileDto }> {
    const { accessToken, user } = await this.authService.register(dto);
    this.setAuthCookie(response, accessToken);

    return { user };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserProfileDto }> {
    const { accessToken, user } = await this.authService.login(dto);
    this.setAuthCookie(response, accessToken);

    return { user };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { success: true } {
    response.clearCookie(AUTH_COOKIE_NAME, this.getClearCookieOptions());

    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedRequestUser): { user: UserProfileDto } {
    return { user };
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: JWT_COOKIE_MAX_AGE_MS,
      path: '/',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
  }

  private getClearCookieOptions(): CookieOptions {
    const { maxAge: _maxAge, ...options } = this.getCookieOptions();

    return options;
  }

  private setAuthCookie(response: Response, accessToken: string) {
    response.cookie(AUTH_COOKIE_NAME, accessToken, this.getCookieOptions());
  }
}
