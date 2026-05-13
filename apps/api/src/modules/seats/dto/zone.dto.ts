import type { ZoneName } from '@repo/db/prisma/client';

export class ZoneDto {
  id!: string;
  eventId!: string;
  name!: ZoneName;
  rows!: number;
  seatsPerRow!: number;
  price!: number;
  seatCount!: number;
}
