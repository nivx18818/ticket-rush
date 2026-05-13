import type { SeatStatus, ZoneName } from '@repo/db/prisma/client';

export class SeatDto {
  id!: string;
  zoneId!: string;
  zoneName!: ZoneName;
  rowLabel!: string;
  seatNumber!: number;
  status!: SeatStatus;
  price!: number;
}
