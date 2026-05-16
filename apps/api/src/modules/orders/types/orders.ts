import type { OrderStatus, SeatStatus, ZoneName } from '@repo/db/prisma/client';

type PriceValue = {
  toString(): string;
};

type LockedOrderSeatRecord = {
  eventId: string;
  id: string;
  lockedById: string | null;
  lockedUntil: Date | null;
  price: PriceValue | number | string;
  rowLabel: string;
  seatNumber: number;
  status: string;
  zoneId: string;
  zoneName: ZoneName;
};

type LockedOrderRecord = {
  eventId: string;
  id: string;
  status: string;
  userId: string;
};

type ConfirmSeatLockRecord = {
  id: string;
  lockedById: string | null;
  lockedUntil: Date | null;
  status: string;
};

type ReleasedSeatRecord = {
  eventId: string;
  seatId: string;
};

type OrderRecord = {
  createdAt: Date;
  eventId: string;
  id: string;
  seats: {
    priceSnapshot: PriceValue | number | string;
    seat: {
      id: string;
      rowLabel: string;
      seatNumber: number;
      status: SeatStatus;
      zone: {
        id: string;
        name: ZoneName;
      };
    };
  }[];
  status: OrderStatus;
  tickets: {
    id: string;
    issuedAt: Date;
    qrCode: string;
    seatId: string;
  }[];
  totalPrice: PriceValue | number | string;
  userId: string;
};

export type {
  ConfirmSeatLockRecord,
  LockedOrderRecord,
  LockedOrderSeatRecord,
  OrderRecord,
  ReleasedSeatRecord,
};
