import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SeatStatus } from '@repo/db/prisma/client';
import cron, { type ScheduledTask } from 'node-cron';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { SeatEventsGateway } from '@/modules/realtime/seat-events.gateway';

import type { ReleasedSeatRecord } from './types/lock-expiry';

export const LOCK_EXPIRY_CRON_EXPRESSION = '*/30 * * * * *';

@Injectable()
export class LockExpiryService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(LockExpiryService.name);
  private task?: ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatEventsGateway: SeatEventsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.task = cron.createTask(
      LOCK_EXPIRY_CRON_EXPRESSION,
      async () => {
        await this.handleTick();
      },
      {
        name: 'lock-expiry-release',
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

    for (const seat of releasedSeats) {
      this.seatEventsGateway.emitSeatUpdated({
        eventId: seat.eventId,
        seatId: seat.seatId,
        status: SeatStatus.AVAILABLE,
      });
    }

    return releasedSeats.length;
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
