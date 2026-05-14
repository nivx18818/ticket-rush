import { Injectable, Logger } from '@nestjs/common';
import { SeatStatus, type ZoneName } from '@repo/db/prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';

import type {
  DashboardOccupancyCounts,
  DashboardUpdatedEventPayload,
  DashboardZoneOccupancy,
  SeatLifecycleChange,
} from './types/seat-events';

import { SeatEventsGateway } from './gateways/seat-events.gateway';

type DashboardSnapshotRow = {
  availableCount: bigint | number | string;
  lockedCount: bigint | number | string;
  revenue: { toString(): string } | number | string | null;
  soldCount: bigint | number | string;
  zoneId: string;
  zoneName: ZoneName;
};

@Injectable()
export class RealtimeUpdatesService {
  private readonly logger = new Logger(RealtimeUpdatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatEventsGateway: SeatEventsGateway,
  ) {}

  async emitSeatLifecycleChanges(
    eventId: string,
    changes: SeatLifecycleChange[],
    status: SeatStatus,
  ): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    try {
      for (const change of changes) {
        this.seatEventsGateway.emitSeatUpdated({
          eventId,
          seatId: change.seatId,
          status,
        });
      }

      await this.emitDashboardUpdated(eventId);
    } catch (error) {
      this.logger.error(`Failed to emit realtime updates for event ${eventId}.`, error);
    }
  }

  async emitDashboardUpdated(eventId: string): Promise<void> {
    const payload = await this.getDashboardSnapshot(eventId);

    this.seatEventsGateway.emitDashboardUpdated(payload);
  }

  async getDashboardSnapshot(eventId: string): Promise<DashboardUpdatedEventPayload> {
    const rows = await this.prisma.$queryRaw<DashboardSnapshotRow[]>`
      WITH confirmed_revenue AS (
        SELECT COALESCE(SUM(total_price), 0) AS revenue
        FROM orders
        WHERE event_id = ${eventId}::uuid
          AND status = 'confirmed'::order_status
      )
      SELECT
        z.id::text AS "zoneId",
        z.name::text AS "zoneName",
        COUNT(s.id) FILTER (WHERE s.status = 'available'::seat_status) AS "availableCount",
        COUNT(s.id) FILTER (WHERE s.status = 'locked'::seat_status) AS "lockedCount",
        COUNT(s.id) FILTER (WHERE s.status = 'sold'::seat_status) AS "soldCount",
        confirmed_revenue.revenue AS "revenue"
      FROM zones AS z
      LEFT JOIN seats AS s ON s.zone_id = z.id
      CROSS JOIN confirmed_revenue
      WHERE z.event_id = ${eventId}::uuid
      GROUP BY z.id, z.name, confirmed_revenue.revenue
      ORDER BY z.name
    `;

    return this.toDashboardPayload(eventId, rows);
  }

  private buildCounts(available: number, locked: number, sold: number): DashboardOccupancyCounts {
    const total = available + locked + sold;

    return {
      available,
      availablePercentage: this.toPercentage(available, total),
      locked,
      lockedPercentage: this.toPercentage(locked, total),
      sold,
      soldPercentage: this.toPercentage(sold, total),
      total,
    };
  }

  private toCount(value: bigint | number | string): number {
    return Number(value.toString());
  }

  private toDashboardPayload(
    eventId: string,
    rows: DashboardSnapshotRow[],
  ): DashboardUpdatedEventPayload {
    const zones: DashboardZoneOccupancy[] = rows.map((row) =>
      this.toZoneOccupancy(
        row.zoneId,
        row.zoneName,
        this.toCount(row.availableCount),
        this.toCount(row.lockedCount),
        this.toCount(row.soldCount),
      ),
    );

    const totals = zones.reduce(
      (accumulator, zone) => ({
        available: accumulator.available + zone.available,
        locked: accumulator.locked + zone.locked,
        sold: accumulator.sold + zone.sold,
      }),
      { available: 0, locked: 0, sold: 0 },
    );

    return {
      eventId,
      occupancy: {
        totals: this.buildCounts(totals.available, totals.locked, totals.sold),
        zones,
      },
      revenue: this.toRevenueNumber(rows[0]?.revenue ?? 0),
    };
  }

  private toPercentage(count: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Number(((count / total) * 100).toFixed(2));
  }

  private toRevenueNumber(value: { toString(): string } | number | string): number {
    return typeof value === 'number' ? value : Number(value.toString());
  }

  private toZoneOccupancy(
    zoneId: string,
    zoneName: ZoneName,
    available: number,
    locked: number,
    sold: number,
  ): DashboardZoneOccupancy {
    return {
      zoneId,
      zoneName,
      ...this.buildCounts(available, locked, sold),
    };
  }
}
