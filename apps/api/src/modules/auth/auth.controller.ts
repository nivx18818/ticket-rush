import type { Request, Response } from 'express';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { UserProfileDto } from '../users/dto/users.dto';
import type { AuthenticatedRequestUser } from './type/auth.types';

import {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  COOKIE_NAMES,
  REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '../../common/constants/cookie-config';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshTokenService } from './refresh-token.service';
import { cookieExtractor } from './utils/cookie-extractor';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<UserProfileDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setAuthCookie(response, accessToken);
    this.setRefreshTokenCookie(response, refreshToken);

    return { message: 'Login successful' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    response.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, CLEAR_COOKIE_OPTIONS);
    response.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, REFRESH_TOKEN_CLEAR_COOKIE_OPTIONS);

    return { message: 'Logged out successfully' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const oldRefreshToken = cookieExtractor('REFRESH_TOKEN')(request);

    if (oldRefreshToken) {
      await this.refreshTokenService.revokeByToken(oldRefreshToken);
    }

    const { accessToken, refreshToken } = await this.authService.refresh(user);
    this.setAuthCookie(response, accessToken);
    this.setRefreshTokenCookie(response, refreshToken);

    return { message: 'Token refreshed' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedRequestUser): { user: UserProfileDto } {
    return { user };
  }

  private setAuthCookie(response: Response, accessToken: string) {
    response.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  }
}
