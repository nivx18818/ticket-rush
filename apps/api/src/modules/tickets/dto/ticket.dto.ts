import type { ZoneName } from '@repo/db/prisma/client';

export class TicketSeatDto {
  rowLabel!: string;
  seatId!: string;
  seatNumber!: number;
  zoneId!: string;
  zoneName!: ZoneName;
}

export class TicketDto {
  eventId!: string;
  id!: string;
  issuedAt!: Date;
  orderId!: string;
  qrCode!: string;
  seat!: TicketSeatDto;
}
