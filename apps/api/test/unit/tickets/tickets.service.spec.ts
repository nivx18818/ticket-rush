import { Test } from '@nestjs/testing';
import { ZoneName } from '@repo/db/prisma/client';

import { TicketNotFoundException } from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { TicketsService } from '@/modules/tickets/tickets.service';

describe('TicketsService', () => {
  const prisma = {
    ticket: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const userId = '9ae59e53-11d2-45c1-a42f-e1eb0f88c22b';
  const ticketId = 'c9b307d8-8013-4e04-ad81-073d78995e5e';
  const orderId = '9d3ec931-a0e7-47c7-a8f7-eefec44ed577';
  const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
  const seatId = '3b389a53-5557-4cd3-80db-f42b772a1887';
  const zoneId = '4dd05fbf-fb23-4fb0-9828-15fe05f3ac14';

  const ticketRecord = {
    id: ticketId,
    issuedAt: new Date('2026-05-13T00:00:00Z'),
    order: {
      eventId,
    },
    orderId,
    qrCode: 'data:image/png;base64,qr',
    seat: {
      id: seatId,
      rowLabel: 'A',
      seatNumber: 1,
      zone: {
        id: zoneId,
        name: ZoneName.VIP,
      },
    },
  };

  let service: TicketsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(TicketsService);
  });

  it('lists only tickets owned by the current user', async () => {
    prisma.ticket.findMany.mockResolvedValue([ticketRecord]);

    await expect(service.listTickets(userId)).resolves.toEqual([
      {
        eventId,
        id: ticketId,
        issuedAt: ticketRecord.issuedAt,
        orderId,
        qrCode: ticketRecord.qrCode,
        seat: {
          rowLabel: 'A',
          seatId,
          seatNumber: 1,
          zoneId,
          zoneName: ZoneName.VIP,
        },
      },
    ]);

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          order: {
            userId,
          },
        },
      }),
    );
  });

  it('returns one owned ticket', async () => {
    prisma.ticket.findFirst.mockResolvedValue(ticketRecord);

    await expect(service.getTicket(userId, ticketId)).resolves.toMatchObject({
      id: ticketId,
      orderId,
      seat: {
        seatId,
      },
    });

    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ticketId,
          order: {
            userId,
          },
        },
      }),
    );
  });

  it('rejects missing or another-user tickets', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);

    await expect(service.getTicket(userId, ticketId)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
  });
});
