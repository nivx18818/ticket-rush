import type { OrderStatus, SeatStatus, ZoneName } from '@repo/db/prisma/client';

export class OrderSeatDto {
  priceSnapshot!: number;
  rowLabel!: string;
  seatId!: string;
  seatNumber!: number;
  seatStatus!: SeatStatus;
  zoneId!: string;
  zoneName!: ZoneName;
}

export class OrderTicketDto {
  id!: string;
  issuedAt!: Date;
  qrCode!: string;
  seatId!: string;
}

export class OrderDto {
  createdAt!: Date;
  eventId!: string;
  id!: string;
  seats!: OrderSeatDto[];
  status!: OrderStatus;
  tickets!: OrderTicketDto[];
  totalPrice!: number;
  userId!: string;
}
