import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, SeatStatus } from '@repo/db/prisma/client';
import { randomUUID } from 'node:crypto';
import { toDataURL } from 'qrcode';

import {
  OrderExpiredException,
  OrderNotFoundException,
  OrderNotPendingException,
  OrderSeatsInvalidException,
} from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';

import type { OrderDto } from './dto/order.dto';
import type {
  ConfirmSeatLockRecord,
  LockedOrderRecord,
  LockedOrderSeatRecord,
  OrderRecord,
} from './types/orders';

const ORDER_SELECT = {
  createdAt: true,
  eventId: true,
  id: true,
  seats: {
    orderBy: {
      seat: {
        id: 'asc',
      },
    },
    select: {
      priceSnapshot: true,
      seat: {
        select: {
          id: true,
          rowLabel: true,
          seatNumber: true,
          status: true,
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  status: true,
  tickets: {
    orderBy: { issuedAt: 'asc' },
    select: {
      id: true,
      issuedAt: true,
      qrCode: true,
      seatId: true,
    },
  },
  totalPrice: true,
  userId: true,
} as const satisfies Prisma.OrderSelect;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeUpdatesService: RealtimeUpdatesService,
  ) {}

  async createOrder(userId: string, seatIds: string[]): Promise<OrderDto> {
    const uniqueSeatIds = this.normalizeSeatIds(seatIds);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const seats = await this.lockCustomerSeatRows(tx, uniqueSeatIds);

      this.assertOrderSeatsValid(seats, uniqueSeatIds.length, userId, now);

      const existingPendingSeat = await tx.orderSeat.findFirst({
        select: { seatId: true },
        where: {
          order: { status: OrderStatus.PENDING },
          seatId: { in: uniqueSeatIds },
        },
      });

      if (existingPendingSeat) {
        throw new OrderSeatsInvalidException();
      }

      const eventId = seats[0]!.eventId;
      const totalPrice = seats.reduce((sum, seat) => sum + this.toPriceNumber(seat.price), 0);
      const order = await tx.order.create({
        data: {
          eventId,
          status: OrderStatus.PENDING,
          totalPrice,
          userId,
        },
        select: { id: true },
      });

      await tx.orderSeat.createMany({
        data: seats.map((seat) => ({
          orderId: order.id,
          priceSnapshot: this.toPriceNumber(seat.price),
          seatId: seat.id,
        })),
      });

      return this.getOrderInTransaction(tx, userId, order.id);
    });
  }

  async getOrder(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      select: ORDER_SELECT,
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return this.toOrderDto(order);
  }

  async confirmOrder(userId: string, orderId: string): Promise<OrderDto> {
    const now = new Date();

    const confirmedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrderRow(tx, orderId);

      if (!order || order.userId !== userId) {
        throw new OrderNotFoundException(orderId);
      }

      this.assertPendingOrder(order.status);

      const orderSeats = await tx.orderSeat.findMany({
        orderBy: { seatId: 'asc' },
        select: { seatId: true },
        where: { orderId },
      });

      if (orderSeats.length === 0) {
        throw new OrderSeatsInvalidException();
      }

      const seatIds = orderSeats.map((orderSeat) => orderSeat.seatId).sort();
      const lockedSeats = await this.lockSeatRowsForConfirm(tx, seatIds);

      if (!this.canConfirmSeats(lockedSeats, seatIds.length, userId, now)) {
        await tx.order.update({
          data: { status: OrderStatus.EXPIRED },
          where: { id: orderId },
        });
        throw new OrderExpiredException();
      }

      await tx.seat.updateMany({
        data: {
          lockedById: null,
          lockedUntil: null,
          status: SeatStatus.SOLD,
        },
        where: {
          id: { in: seatIds },
          lockedById: userId,
          status: SeatStatus.LOCKED,
        },
      });

      const ticketData = await Promise.all(
        seatIds.map(async (seatId) => {
          const ticketId = randomUUID();

          return {
            id: ticketId,
            orderId,
            qrCode: await toDataURL(ticketId),
            seatId,
          };
        }),
      );

      await tx.ticket.createMany({
        data: ticketData,
      });

      await tx.order.update({
        data: { status: OrderStatus.CONFIRMED },
        where: { id: orderId },
      });

      return this.getOrderInTransaction(tx, userId, orderId);
    });

    await this.realtimeUpdatesService.emitSeatLifecycleChanges(
      confirmedOrder.eventId,
      confirmedOrder.seats.map((seat) => ({
        eventId: confirmedOrder.eventId,
        seatId: seat.seatId,
      })),
      SeatStatus.SOLD,
    );

    return confirmedOrder;
  }

  private assertOrderSeatsValid(
    seats: LockedOrderSeatRecord[],
    expectedCount: number,
    userId: string,
    now: Date,
  ): void {
    if (seats.length !== expectedCount) {
      throw new OrderSeatsInvalidException();
    }

    const [firstSeat] = seats;

    if (!firstSeat) {
      throw new OrderSeatsInvalidException();
    }

    const eventId = firstSeat.eventId;
    const hasInvalidSeat = seats.some(
      (seat) =>
        seat.eventId !== eventId ||
        seat.lockedById !== userId ||
        !seat.lockedUntil ||
        seat.lockedUntil <= now ||
        !this.isStatus(seat.status, 'locked'),
    );

    if (hasInvalidSeat) {
      throw new OrderSeatsInvalidException();
    }
  }

  private assertPendingOrder(status: string): void {
    if (this.isStatus(status, 'expired')) {
      throw new OrderExpiredException();
    }

    if (!this.isStatus(status, 'pending')) {
      throw new OrderNotPendingException();
    }
  }

  private canConfirmSeats(
    seats: ConfirmSeatLockRecord[],
    expectedCount: number,
    userId: string,
    now: Date,
  ): boolean {
    return (
      seats.length === expectedCount &&
      seats.every(
        (seat) =>
          seat.lockedById === userId &&
          Boolean(seat.lockedUntil) &&
          seat.lockedUntil! > now &&
          this.isStatus(seat.status, 'locked'),
      )
    );
  }

  private async getOrderInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
  ): Promise<OrderDto> {
    const order = await tx.order.findFirst({
      select: ORDER_SELECT,
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return this.toOrderDto(order);
  }

  private isStatus(status: string, expected: string): boolean {
    return status.toString().toLowerCase() === expected;
  }

  private async lockCustomerSeatRows(
    tx: Prisma.TransactionClient,
    seatIds: string[],
  ): Promise<LockedOrderSeatRecord[]> {
    // Prisma Client cannot express PostgreSQL row-level locks, so this uses raw SQL.
    return tx.$queryRaw<LockedOrderSeatRecord[]>`
      SELECT
        s.id::text AS "id",
        s.status::text AS "status",
        s.locked_by::text AS "lockedById",
        s.locked_until AS "lockedUntil",
        s.row_label AS "rowLabel",
        s.seat_number AS "seatNumber",
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

  private async lockOrderRow(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<LockedOrderRecord | null> {
    const rows = await tx.$queryRaw<LockedOrderRecord[]>`
      SELECT
        id::text AS "id",
        user_id::text AS "userId",
        event_id::text AS "eventId",
        status::text AS "status"
      FROM orders
      WHERE id = ${orderId}::uuid
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  private async lockSeatRowsForConfirm(
    tx: Prisma.TransactionClient,
    seatIds: string[],
  ): Promise<ConfirmSeatLockRecord[]> {
    // Prisma Client cannot express PostgreSQL row-level locks, so this uses raw SQL.
    return tx.$queryRaw<ConfirmSeatLockRecord[]>`
      SELECT
        id::text AS "id",
        status::text AS "status",
        locked_by::text AS "lockedById",
        locked_until AS "lockedUntil"
      FROM seats
      WHERE id = ANY(${seatIds}::uuid[])
      ORDER BY id
      FOR UPDATE
    `;
  }

  private normalizeSeatIds(seatIds: string[]): string[] {
    return [...new Set(seatIds)].sort();
  }

  private toOrderDto(order: OrderRecord): OrderDto {
    return {
      createdAt: order.createdAt,
      eventId: order.eventId,
      id: order.id,
      seats: order.seats.map((orderSeat) => ({
        priceSnapshot: this.toPriceNumber(orderSeat.priceSnapshot),
        rowLabel: orderSeat.seat.rowLabel,
        seatId: orderSeat.seat.id,
        seatNumber: orderSeat.seat.seatNumber,
        seatStatus: orderSeat.seat.status,
        zoneId: orderSeat.seat.zone.id,
        zoneName: orderSeat.seat.zone.name,
      })),
      status: order.status,
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        issuedAt: ticket.issuedAt,
        qrCode: ticket.qrCode,
        seatId: ticket.seatId,
      })),
      totalPrice: this.toPriceNumber(order.totalPrice),
      userId: order.userId,
    };
  }

  private toPriceNumber(price: { toString(): string } | number | string): number {
    return typeof price === 'number' ? price : Number(price.toString());
  }
}
