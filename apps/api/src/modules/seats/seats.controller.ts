import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import type { SeatDto } from './dto/seat.dto';
import type { ZoneDto } from './dto/zone.dto';

import { CreateZoneDto } from './dto/create-zone.dto';
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
