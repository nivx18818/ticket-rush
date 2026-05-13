import { Injectable } from '@nestjs/common';
import { EventStatus, Prisma, SeatStatus } from '@repo/db/prisma/client';

import {
  EventNotDraftException,
  EventNotFoundException,
  SeatNotAvailableException,
  ZoneAlreadyExistsException,
} from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';

import type { CreateZoneDto } from './dto/create-zone.dto';
import type { LockSeatsDto } from './dto/lock-seats.dto';
import type { ReleaseSeatsDto } from './dto/release-seats.dto';
import type { SeatDto } from './dto/seat.dto';
import type { ZoneDto } from './dto/zone.dto';
import type { LockedSeatRecord, PriceValue, SeatRecord, ZoneRecord } from './types/seats';

import { buildSeatMatrix } from './utils/seat-matrix';

const LOCK_DURATION_MS = 10 * 60 * 1000;

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

  async lockSeats(userId: string, seatIds: string[]): Promise<LockSeatsDto> {
    const uniqueSeatIds = this.normalizeSeatIds(seatIds);
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);

    return this.prisma.$transaction(async (tx) => {
      const seats = await this.lockAvailableSeatRows(tx, uniqueSeatIds);

      this.assertLockableSeats(seats, uniqueSeatIds.length);

      await tx.seat.updateMany({
        data: {
          lockedById: userId,
          lockedUntil,
          status: SeatStatus.LOCKED,
        },
        where: {
          id: { in: uniqueSeatIds },
          status: SeatStatus.AVAILABLE,
        },
      });

      return {
        lockedUntil,
        seats: seats.map((seat) => this.toLockedSeatDto(seat)),
      };
    });
  }

  async releaseSeats(userId: string, seatIds: string[]): Promise<ReleaseSeatsDto> {
    const uniqueSeatIds = this.normalizeSeatIds(seatIds);

    const result = await this.prisma.seat.updateMany({
      data: {
        lockedById: null,
        lockedUntil: null,
        status: SeatStatus.AVAILABLE,
      },
      where: {
        id: { in: uniqueSeatIds },
        lockedById: userId,
        status: SeatStatus.LOCKED,
      },
    });

    return { releasedCount: result.count };
  }

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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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

  private assertLockableSeats(seats: LockedSeatRecord[], expectedCount: number): void {
    if (seats.length !== expectedCount) {
      throw new SeatNotAvailableException();
    }

    const [firstSeat] = seats;

    if (!firstSeat) {
      throw new SeatNotAvailableException();
    }

    const eventId = firstSeat.eventId;
    const hasMixedEvents = seats.some((seat) => seat.eventId !== eventId);
    const hasUnavailableSeat = seats.some((seat) => !this.isSeatStatus(seat.status, 'available'));

    if (hasMixedEvents || hasUnavailableSeat) {
      throw new SeatNotAvailableException();
    }
  }

  private isSeatStatus(status: string, expected: 'available' | 'locked'): boolean {
    return status.toString().toLowerCase() === expected;
  }

  private async lockAvailableSeatRows(
    tx: Prisma.TransactionClient,
    seatIds: string[],
  ): Promise<LockedSeatRecord[]> {
    // Prisma Client cannot express PostgreSQL row-level locks, so this uses raw SQL.
    return tx.$queryRaw<LockedSeatRecord[]>`
      SELECT
        s.id::text AS "id",
        s.row_label AS "rowLabel",
        s.seat_number AS "seatNumber",
        s.status::text AS "status",
        z.id::text AS "zoneId",
        z.name::text AS "zoneName",
        z.event_id::text AS "eventId",
        z.price AS "price"
      FROM seats s
      INNER JOIN zones z ON z.id = s.zone_id
      INNER JOIN events e ON e.id = z.event_id
      WHERE s.id = ANY(${seatIds}::uuid[])
        AND e.status = 'published'::event_status
      ORDER BY s.id
      FOR UPDATE OF s
    `;
  }

  private normalizeSeatIds(seatIds: string[]): string[] {
    return [...new Set(seatIds)].sort();
  }

  private toLockedSeatDto(seat: LockedSeatRecord): SeatDto {
    return {
      id: seat.id,
      price: this.toPriceNumber(seat.price),
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      status: SeatStatus.LOCKED,
      zoneId: seat.zoneId,
      zoneName: seat.zoneName,
    };
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
