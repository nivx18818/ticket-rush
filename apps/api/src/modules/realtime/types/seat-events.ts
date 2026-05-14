import type { SeatStatus } from '@repo/db/prisma/client';

export type SeatUpdatedEventPayload = {
  eventId: string;
  seatId: string;
  status: SeatStatus;
};
