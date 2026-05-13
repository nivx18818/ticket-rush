import type { ZoneName } from '@repo/db/prisma/client';

type TicketRecord = {
  id: string;
  issuedAt: Date;
  order: {
    eventId: string;
  };
  orderId: string;
  qrCode: string;
  seat: {
    id: string;
    rowLabel: string;
    seatNumber: number;
    zone: {
      id: string;
      name: ZoneName;
    };
  };
};

export type { TicketRecord };
