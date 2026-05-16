import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SeatStatus } from '@repo/db/prisma/client';
import cron, { type ScheduledTask } from 'node-cron';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';

import type { ExpiredOrderRecord, ReleasedOrderSeatRecord } from './types/order-expiry';

export const ORDER_EXPIRY_CRON_EXPRESSION = '0 * * * * *';
export const ORDER_EXPIRY_TTL_MINUTES = 10;

@Injectable()
export class OrderExpiryService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(OrderExpiryService.name);
  private task?: ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeUpdatesService: RealtimeUpdatesService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.task = cron.createTask(
      ORDER_EXPIRY_CRON_EXPRESSION,
      async () => {
        await this.handleTick();
      },
      {
        name: 'order-expiry-release',
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

  async expireStaleOrders(): Promise<number> {
    const { expiredOrders, releasedSeats } = await this.prisma.$transaction(async (tx) => {
      // Prisma Client cannot express UPDATE ... RETURNING, so raw SQL is needed here.
      const expiredOrders = await tx.$queryRaw<ExpiredOrderRecord[]>`
        UPDATE orders
        SET status = 'expired'::order_status
        WHERE status = 'pending'::order_status
          AND created_at <= NOW() - (${ORDER_EXPIRY_TTL_MINUTES} * INTERVAL '1 minute')
        RETURNING
          id::text AS "orderId",
          event_id::text AS "eventId"
      `;

      if (expiredOrders.length === 0) {
        return { expiredOrders, releasedSeats: [] as ReleasedOrderSeatRecord[] };
      }

      const expiredOrderIds = expiredOrders.map((order) => order.orderId);
      const releasedSeats = await tx.$queryRaw<ReleasedOrderSeatRecord[]>`
        UPDATE seats s
        SET
          status = 'available'::seat_status,
          locked_by = NULL,
          locked_until = NULL
        FROM order_seats os
        INNER JOIN orders o ON o.id = os.order_id
        WHERE os.seat_id = s.id
          AND os.order_id = ANY(${expiredOrderIds}::uuid[])
          AND s.status = 'locked'::seat_status
          AND s.locked_by = o.user_id
        RETURNING
          o.event_id::text AS "eventId",
          s.id::text AS "seatId"
      `;

      return { expiredOrders, releasedSeats };
    });

    if (releasedSeats.length > 0) {
      await this.emitReleasedSeatsByEvent(releasedSeats);
    }

    return expiredOrders.length;
  }

  private async emitReleasedSeatsByEvent(releasedSeats: ReleasedOrderSeatRecord[]): Promise<void> {
    const seatsByEvent = new Map<string, ReleasedOrderSeatRecord[]>();

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
      const expiredCount = await this.expireStaleOrders();

      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} pending order(s).`);
      }
    } catch (error) {
      this.logger.error('Failed to expire pending orders.', error);
    }
  }
}
