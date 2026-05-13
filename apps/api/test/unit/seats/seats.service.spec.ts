import { Test } from '@nestjs/testing';
import { EventStatus, Prisma, SeatStatus, ZoneName } from '@repo/db/prisma/client';

import {
  EventNotDraftException,
  EventNotFoundException,
  ZoneAlreadyExistsException,
} from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { SeatsService } from '@/modules/seats/seats.service';

describe('SeatsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    event: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    seat: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    zone: {
      create: jest.fn(),
    },
  };

  const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
  const zoneId = '4dd05fbf-fb23-4fb0-9828-15fe05f3ac14';

  let service: SeatsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        SeatsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(SeatsService);
  });

  it('creates a draft event zone and generates all seat records', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, status: EventStatus.DRAFT });
    prisma.zone.create.mockResolvedValue({
      eventId,
      id: zoneId,
      name: ZoneName.VIP,
      price: 180,
      rows: 2,
      seatsPerRow: 3,
    });
    prisma.seat.createMany.mockResolvedValue({ count: 6 });

    await expect(
      service.createZone(eventId, {
        name: ZoneName.VIP,
        price: 180,
        rows: 2,
        seatsPerRow: 3,
      }),
    ).resolves.toEqual({
      eventId,
      id: zoneId,
      name: ZoneName.VIP,
      price: 180,
      rows: 2,
      seatCount: 6,
      seatsPerRow: 3,
    });

    expect(prisma.zone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          eventId,
          name: ZoneName.VIP,
          price: 180,
          rows: 2,
          seatsPerRow: 3,
        },
      }),
    );
    expect(prisma.seat.createMany).toHaveBeenCalledWith({
      data: [
        { rowLabel: 'A', seatNumber: 1, zoneId },
        { rowLabel: 'A', seatNumber: 2, zoneId },
        { rowLabel: 'A', seatNumber: 3, zoneId },
        { rowLabel: 'B', seatNumber: 1, zoneId },
        { rowLabel: 'B', seatNumber: 2, zoneId },
        { rowLabel: 'B', seatNumber: 3, zoneId },
      ],
    });
  });

  it('returns a custom conflict when the event already has the zone', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['event_id', 'name'] },
      }),
    );

    await expect(
      service.createZone(eventId, {
        name: ZoneName.VIP,
        price: 180,
        rows: 2,
        seatsPerRow: 3,
      }),
    ).rejects.toBeInstanceOf(ZoneAlreadyExistsException);
  });

  it('rejects zone creation for published events', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, status: EventStatus.PUBLISHED });

    await expect(
      service.createZone(eventId, {
        name: ZoneName.VIP,
        price: 180,
        rows: 2,
        seatsPerRow: 3,
      }),
    ).rejects.toBeInstanceOf(EventNotDraftException);

    expect(prisma.zone.create).not.toHaveBeenCalled();
    expect(prisma.seat.createMany).not.toHaveBeenCalled();
  });

  it('throws when creating a zone for a missing event', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(
      service.createZone(eventId, {
        name: ZoneName.VIP,
        price: 180,
        rows: 2,
        seatsPerRow: 3,
      }),
    ).rejects.toBeInstanceOf(EventNotFoundException);
  });

  it('lists all seats for a published event with current status and price', async () => {
    prisma.event.findFirst.mockResolvedValue({ id: eventId });
    prisma.seat.findMany.mockResolvedValue([
      {
        id: 'seat-1',
        rowLabel: 'A',
        seatNumber: 1,
        status: SeatStatus.AVAILABLE,
        zone: {
          id: zoneId,
          name: ZoneName.VIP,
          price: { toString: () => '180.5' },
        },
      },
      {
        id: 'seat-2',
        rowLabel: 'A',
        seatNumber: 2,
        status: SeatStatus.LOCKED,
        zone: {
          id: zoneId,
          name: ZoneName.VIP,
          price: { toString: () => '180.5' },
        },
      },
    ]);

    await expect(service.listEventSeats(eventId)).resolves.toEqual([
      {
        id: 'seat-1',
        price: 180.5,
        rowLabel: 'A',
        seatNumber: 1,
        status: SeatStatus.AVAILABLE,
        zoneId,
        zoneName: ZoneName.VIP,
      },
      {
        id: 'seat-2',
        price: 180.5,
        rowLabel: 'A',
        seatNumber: 2,
        status: SeatStatus.LOCKED,
        zoneId,
        zoneName: ZoneName.VIP,
      },
    ]);

    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        id: eventId,
        status: EventStatus.PUBLISHED,
      },
    });
    expect(prisma.seat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          zone: {
            eventId,
          },
        },
      }),
    );
  });

  it('does not expose seats for draft or missing events', async () => {
    prisma.event.findFirst.mockResolvedValue(null);

    await expect(service.listEventSeats(eventId)).rejects.toBeInstanceOf(EventNotFoundException);
    expect(prisma.seat.findMany).not.toHaveBeenCalled();
  });
});
