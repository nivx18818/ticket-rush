import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SeatStatus } from '@repo/db/prisma/client';
import cron, { type ScheduledTask } from 'node-cron';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';

import type { ReleasedSeatRecord } from './types/seat-lock-expiry';

export const SEAT_LOCK_EXPIRY_CRON_EXPRESSION = '*/30 * * * * *';

@Injectable()
export class SeatLockExpiryService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(SeatLockExpiryService.name);
  private task?: ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeUpdatesService: RealtimeUpdatesService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.task = cron.createTask(
      SEAT_LOCK_EXPIRY_CRON_EXPRESSION,
      async () => {
        await this.handleTick();
      },
      {
        name: 'seat-lock-expiry-release',
        noOverlap: true,
      },
    );

    await this.task.start();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.task) {
      return;
    }

    await this.task.stop();
    await this.task.destroy();
  }

  async releaseExpiredLocks(): Promise<number> {
    const releasedSeats = await this.prisma.$queryRaw<ReleasedSeatRecord[]>`
      UPDATE seats s
      SET
        status = 'available'::seat_status,
        locked_by = NULL,
        locked_until = NULL
      FROM zones z
      WHERE z.id = s.zone_id
        AND s.status = 'locked'::seat_status
        AND s.locked_until <= NOW()
      RETURNING
        z.event_id::text AS "eventId",
        s.id::text AS "seatId"
    `;

    await this.emitReleasedSeatsByEvent(releasedSeats);

    return releasedSeats.length;
  }

  private async emitReleasedSeatsByEvent(releasedSeats: ReleasedSeatRecord[]): Promise<void> {
    const seatsByEvent = new Map<string, ReleasedSeatRecord[]>();

    for (const releasedSeat of releasedSeats) {
      const eventSeats = seatsByEvent.get(releasedSeat.eventId) ?? [];

      eventSeats.push(releasedSeat);
      seatsByEvent.set(releasedSeat.eventId, eventSeats);
    }

    for (const [eventId, eventSeats] of seatsByEvent) {
      await this.realtimeUpdatesService.emitSeatLifecycleChanges(
        eventId,
        eventSeats,
        SeatStatus.AVAILABLE,
      );
    }
  }

  private async handleTick(): Promise<void> {
    try {
      const releasedCount = await this.releaseExpiredLocks();

      if (releasedCount > 0) {
        this.logger.log(`Released ${releasedCount} expired seat lock(s).`);
      }
    } catch (error) {
      this.logger.error('Failed to release expired seat locks.', error);
    }
  }
}
