import type { SeatStatus, ZoneName } from '@repo/db/prisma/client';

type PriceValue = {
  toString(): string;
};

type ZoneRecord = {
  eventId: string;
  id: string;
  name: ZoneName;
  price: PriceValue | number | string;
  rows: number;
  seatsPerRow: number;
};

type SeatRecord = {
  id: string;
  rowLabel: string;
  seatNumber: number;
  status: SeatStatus;
  zone: {
    id: string;
    name: ZoneName;
    price: PriceValue | number | string;
  };
};

type LockedSeatRecord = {
  eventId: string;
  id: string;
  price: PriceValue | number | string;
  rowLabel: string;
  seatNumber: number;
  status: string;
  zoneId: string;
  zoneName: ZoneName;
};

export type { LockedSeatRecord, PriceValue, SeatRecord, ZoneRecord };
