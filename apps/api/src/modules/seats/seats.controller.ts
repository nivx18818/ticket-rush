import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import type { AuthenticatedRequestUser } from '@/modules/auth/type/auth.types';

import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import type { LockSeatsDto } from './dto/lock-seats.dto';
import type { ReleaseSeatsDto } from './dto/release-seats.dto';
import type { SeatDto } from './dto/seat.dto';
import type { ZoneDto } from './dto/zone.dto';

import { CreateZoneDto } from './dto/create-zone.dto';
import { SeatSelectionDto } from './dto/seat-selection.dto';
import { SeatsService } from './seats.service';

@Controller('admin/events/:eventId/zones')
@Roles(UserRole.ADMIN)
export class AdminSeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createZone(@Param('eventId') eventId: string, @Body() dto: CreateZoneDto): Promise<ZoneDto> {
    return this.seatsService.createZone(eventId, dto);
  }
}

@Controller('events/:eventId/seats')
export class PublicSeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Public()
  @Get()
  listEventSeats(@Param('eventId') eventId: string): Promise<SeatDto[]> {
    return this.seatsService.listEventSeats(eventId);
  }
}

@Controller('seats')
@Roles(UserRole.CUSTOMER)
export class CustomerSeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post('lock')
  @HttpCode(HttpStatus.OK)
  lockSeats(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: SeatSelectionDto,
  ): Promise<LockSeatsDto> {
    return this.seatsService.lockSeats(user.id, dto.seatIds);
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  releaseSeats(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: SeatSelectionDto,
  ): Promise<ReleaseSeatsDto> {
    return this.seatsService.releaseSeats(user.id, dto.seatIds);
  }
}
