import { Injectable } from '@nestjs/common';
import { EventStatus, Prisma } from '@repo/db/prisma/client';

import {
  EventNotDraftException,
  EventNotFoundException,
  ZoneAlreadyExistsException,
} from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';

import type { CreateZoneDto } from './dto/create-zone.dto';
import type { SeatDto } from './dto/seat.dto';
import type { ZoneDto } from './dto/zone.dto';
import type { PriceValue, SeatRecord, ZoneRecord } from './type/seats.types';

import { buildSeatMatrix } from './utils/seat-matrix';

const EVENT_STATUS_SELECT = {
  id: true,
  status: true,
} as const satisfies Prisma.EventSelect;

const ZONE_SELECT = {
  eventId: true,
  id: true,
  name: true,
  price: true,
  rows: true,
  seatsPerRow: true,
} as const satisfies Prisma.ZoneSelect;

const SEAT_LIST_SELECT = {
  id: true,
  rowLabel: true,
  seatNumber: true,
  status: true,
  zone: {
    select: {
      id: true,
      name: true,
      price: true,
    },
  },
} as const satisfies Prisma.SeatSelect;

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async createZone(eventId: string, dto: CreateZoneDto): Promise<ZoneDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
          select: EVENT_STATUS_SELECT,
          where: { id: eventId },
        });

        if (!event) {
          throw new EventNotFoundException(eventId);
        }

        if (event.status !== EventStatus.DRAFT) {
          throw new EventNotDraftException();
        }

        const zone = await tx.zone.create({
          data: {
            eventId,
            name: dto.name,
            price: dto.price,
            rows: dto.rows,
            seatsPerRow: dto.seatsPerRow,
          },
          select: ZONE_SELECT,
        });
        const seats = buildSeatMatrix(zone.id, dto.rows, dto.seatsPerRow);

        await tx.seat.createMany({
          data: seats,
        });

        return this.toZoneDto(zone, seats.length);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ZoneAlreadyExistsException(eventId, dto.name);
      }

      throw error;
    }
  }

  async listEventSeats(eventId: string): Promise<SeatDto[]> {
    const event = await this.prisma.event.findFirst({
      select: { id: true },
      where: {
        id: eventId,
        status: EventStatus.PUBLISHED,
      },
    });

    if (!event) {
      throw new EventNotFoundException(eventId);
    }

    const seats = await this.prisma.seat.findMany({
      orderBy: [{ zone: { name: 'asc' } }, { rowLabel: 'asc' }, { seatNumber: 'asc' }],
      select: SEAT_LIST_SELECT,
      where: {
        zone: {
          eventId,
        },
      },
    });

    return seats.map((seat) => this.toSeatDto(seat));
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private toSeatDto(seat: SeatRecord): SeatDto {
    return {
      id: seat.id,
      price: this.toPriceNumber(seat.zone.price),
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      status: seat.status,
      zoneId: seat.zone.id,
      zoneName: seat.zone.name,
    };
  }

  private toZoneDto(zone: ZoneRecord, seatCount: number): ZoneDto {
    return {
      eventId: zone.eventId,
      id: zone.id,
      name: zone.name,
      price: this.toPriceNumber(zone.price),
      rows: zone.rows,
      seatCount,
      seatsPerRow: zone.seatsPerRow,
    };
  }

  private toPriceNumber(price: PriceValue | number | string): number {
    return typeof price === 'number' ? price : Number(price.toString());
  }
}
