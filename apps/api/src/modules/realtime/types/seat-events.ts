import type { SeatStatus, ZoneName } from '@repo/db/prisma/client';

export type SeatUpdatedEventPayload = {
  eventId: string;
  seatId: string;
  status: SeatStatus;
};

export type SeatLifecycleChange = {
  eventId: string;
  seatId: string;
};

export type DashboardOccupancyCounts = {
  available: number;
  availablePercentage: number;
  locked: number;
  lockedPercentage: number;
  sold: number;
  soldPercentage: number;
  total: number;
};

export type DashboardZoneOccupancy = DashboardOccupancyCounts & {
  zoneId: string;
  zoneName: ZoneName;
};

export type DashboardUpdatedEventPayload = {
  eventId: string;
  occupancy: {
    totals: DashboardOccupancyCounts;
    zones: DashboardZoneOccupancy[];
  };
  revenue: number;
};
